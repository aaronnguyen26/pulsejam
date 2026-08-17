/**
 * PulseJam Stage 1 Redesign — ConditioningBridge
 *
 * Constructs 40ms ConditioningFrame payloads containing General MIDI pitch states,
 * tier-derived style prompts, and dynamic confidence-gated operational mode.
 * Owns WebSocket sidecar management with latency handshakes and dry-run debug support.
 */

import {
  ConditioningFrame,
  DSPMetrics,
  PerformanceTier,
  SidecarConnectionState,
  SidecarStatus,
} from './types';
import { AIAudioReceiver } from './AIAudioReceiver';


export interface ConditioningBridgeOptions {
  wsUrl?: string;
  authToken?: string;
  tickIntervalMs?: number;
  debugMode?: boolean;
  tierPromptMap?: Record<PerformanceTier, string>;
  confidenceWindowSize?: number;
  confidenceDropThreshold?: number;
  confidenceRecoveryThreshold?: number;
  confidenceSustainTicks?: number;
  latencyThresholdMs?: number;
  metricsStalenessMs?: number;
}

export type StatusCallback = (status: SidecarStatus) => void;
export type FrameCallback = (frame: ConditioningFrame) => void;

const DEFAULT_TIER_PROMPTS: Record<PerformanceTier, string> = {
  chill: 'sparse ambient',
  groove: 'steady groove',
  peak: 'driving energetic',
};

export class ConditioningBridge {
  private wsUrl: string;
  private authToken?: string;
  private tickIntervalMs: number;
  private debugMode: boolean;
  private tierPromptMap: Record<PerformanceTier, string>;

  // Confidence Gating & Staleness Constants
  private confidenceWindowSize: number;
  private confidenceDropThreshold: number;
  private confidenceRecoveryThreshold: number;
  private confidenceSustainTicks: number;
  private latencyThresholdMs: number;
  private metricsStalenessMs: number;

  // Runtime State
  private latestMetrics: DSPMetrics | null = null;
  private prevPitch: number | null = null;
  private confidenceHistory: number[] = [];
  private currentLiveMode: 'midi+audio' | 'audio-only' = 'midi+audio';
  private calibrationCeiling: 'midi+audio' | 'audio-only' = 'midi+audio';
  private consecutiveLowConfidenceTicks = 0;
  private consecutiveHighConfidenceTicks = 0;

  // WebSocket & Sidecar State
  private socket: WebSocket | null = null;
  private sidecarStatus: SidecarStatus = { state: 'unavailable' };
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimestamp: number | null = null;
  private reconnectDelayMs = 2000;
  private maxReconnectDelayMs = 30000;
  private aiAudioReceiver: AIAudioReceiver | null = null;
  private receivedAudioSeq = 0;


  // Timer & Subscribers
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private statusListeners: Set<StatusCallback> = new Set();
  private frameListeners: Set<FrameCallback> = new Set();
  private debugFrameHistory: ConditioningFrame[] = [];

  constructor(options: ConditioningBridgeOptions = {}) {
    this.wsUrl = options.wsUrl || 'ws://localhost:9090';
    this.authToken = options.authToken;
    this.tickIntervalMs = options.tickIntervalMs || 40;
    this.debugMode = options.debugMode ?? true;
    this.tierPromptMap = options.tierPromptMap || DEFAULT_TIER_PROMPTS;

    this.confidenceWindowSize = options.confidenceWindowSize || 10;
    this.confidenceDropThreshold = options.confidenceDropThreshold || 0.35;
    this.confidenceRecoveryThreshold = options.confidenceRecoveryThreshold || 0.60;
    this.confidenceSustainTicks = options.confidenceSustainTicks || 5;
    this.latencyThresholdMs = options.latencyThresholdMs || 100;
    this.metricsStalenessMs = options.metricsStalenessMs || 200;
  }

  public setAuthToken(token?: string) {
    this.authToken = token;
  }

  public start() {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => this.onTick(), this.tickIntervalMs);
  }

  public stop() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.disconnect();
  }

  public setTierPromptMap(map: Record<PerformanceTier, string>) {
    this.tierPromptMap = { ...this.tierPromptMap, ...map };
  }

  public setCalibrationCeiling(ceiling: 'midi+audio' | 'audio-only') {
    this.calibrationCeiling = ceiling;
    if (ceiling === 'audio-only') {
      this.currentLiveMode = 'audio-only';
    }
  }

  public attachAIAudioReceiver(receiver: AIAudioReceiver | null) {
    this.aiAudioReceiver = receiver;
  }

  public setAIAudioReceiver(receiver: AIAudioReceiver | null) {
    this.attachAIAudioReceiver(receiver);
  }

  public getAIAudioReceiver(): AIAudioReceiver | null {
    return this.aiAudioReceiver;
  }

  public updateMetrics(metrics: DSPMetrics) {
    this.latestMetrics = {
      ...metrics,
      wallClockTimestamp: metrics.wallClockTimestamp ?? Date.now(),
    };
    if (metrics.calibration && metrics.calibration.conditioningMode) {
      this.calibrationCeiling = metrics.calibration.conditioningMode;
    }
  }

  public processMetrics(metrics: DSPMetrics) {
    this.updateMetrics(metrics);
  }

  private onTick() {
    const now = Date.now();
    const metrics = this.latestMetrics;

    const isStale =
      !metrics ||
      !metrics.wallClockTimestamp ||
      now - metrics.wallClockTimestamp > this.metricsStalenessMs;

    let pitchState: number[];
    let stylePrompt: string;
    let effectiveMode: 'midi+audio' | 'audio-only';
    let chromaVector: number[] | undefined = undefined;
    let estimatedKey: string | undefined = undefined;
    let estimatedBpm: number | undefined = undefined;

    if (isStale || !metrics) {
      // Metric Staleness Fallback -> audio-only with all pitch states masked (-1)
      this.currentLiveMode = 'audio-only';
      effectiveMode = 'audio-only';
      pitchState = new Array<number>(128).fill(-1);
      stylePrompt = DEFAULT_TIER_PROMPTS.chill;
      this.prevPitch = null;
    } else {
      const pitch = metrics.currentPitch ?? null;
      const confidence = metrics.pitchConfidence ?? 0;
      chromaVector = metrics.chromaVector;
      estimatedKey = metrics.estimatedKey;
      estimatedBpm = metrics.detectedBpm;

      // 1. Update Confidence Rolling Window & Live Gating Mode
      this.updateConfidenceMode(confidence);

      // 2. Determine Effective Live Mode (Enforce Calibration Ceiling)
      effectiveMode =
        this.calibrationCeiling === 'audio-only' ? 'audio-only' : this.currentLiveMode;

      // 3. Construct 128-element General MIDI Pitch State Array
      // Protocol: -1 = masked/unconditioned, 0 = note off, 1 = sustain, 2 = onset, 3 = free play
      pitchState = new Array<number>(128).fill(-1);
      if (effectiveMode === 'midi+audio' && pitch !== null && pitch >= 0 && pitch <= 127) {
        if (this.prevPitch !== pitch) {
          pitchState[pitch] = 2; // Onset
        } else {
          pitchState[pitch] = 1; // Sustain
        }
      }
      this.prevPitch = pitch;

      // 4. Style Prompt derived from Active Tier
      const tier = metrics.activeTier || 'chill';
      stylePrompt = this.tierPromptMap[tier] || DEFAULT_TIER_PROMPTS.chill;
    }

    // 5. Assemble ConditioningFrame
    const frame: ConditioningFrame = {
      pitchState,
      stylePrompt,
      timestamp: now,
      mode: effectiveMode,
      chromaVector,
      estimatedKey,
      estimatedBpm,
    };

    // 6. Forward Frame to Subscribers & Sidecar WebSocket
    this.notifyFrame(frame);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type: 'CONDITIONING_FRAME', payload: frame }));
      } catch (err) {
        console.warn('ConditioningBridge WebSocket send error:', err);
      }
    } else if (this.debugMode) {
      this.debugFrameHistory = [frame, ...this.debugFrameHistory].slice(0, 50);
    }
  }

  private updateConfidenceMode(confidence: number) {
    this.confidenceHistory.push(confidence);
    if (this.confidenceHistory.length > this.confidenceWindowSize) {
      this.confidenceHistory.shift();
    }

    const avgConfidence =
      this.confidenceHistory.reduce((a, b) => a + b, 0) / this.confidenceHistory.length;

    if (avgConfidence < this.confidenceDropThreshold) {
      this.consecutiveLowConfidenceTicks++;
      this.consecutiveHighConfidenceTicks = 0;
      if (this.consecutiveLowConfidenceTicks >= this.confidenceSustainTicks) {
        this.currentLiveMode = 'audio-only';
      }
    } else if (avgConfidence >= this.confidenceRecoveryThreshold) {
      this.consecutiveHighConfidenceTicks++;
      this.consecutiveLowConfidenceTicks = 0;
      if (
        this.consecutiveHighConfidenceTicks >= this.confidenceSustainTicks &&
        this.calibrationCeiling === 'midi+audio'
      ) {
        this.currentLiveMode = 'midi+audio';
      }
    } else {
      this.consecutiveLowConfidenceTicks = 0;
      this.consecutiveHighConfidenceTicks = 0;
    }
  }

  // ─── WebSocket & Sidecar Connection Management ─────────────────────────

  public connect(url?: string) {
    if (url) this.wsUrl = url;
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.setStatus({ state: 'connecting' });

    try {
      let targetUrl = this.wsUrl;
      if (this.authToken) {
        const separator = targetUrl.includes('?') ? '&' : '?';
        targetUrl = `${targetUrl}${separator}token=${encodeURIComponent(this.authToken)}`;
      }

      this.socket = new WebSocket(targetUrl);
      this.socket.binaryType = 'arraybuffer';

      this.socket.onopen = () => {
        this.reconnectDelayMs = 2000;
        this.pingTimestamp = Date.now();
        this.socket?.send(
          JSON.stringify({
            type: 'ping',
            timestamp: this.pingTimestamp,
            token: this.authToken,
          })
        );
      };

      this.socket.onmessage = (event) => {
        try {
          if (typeof event.data === 'string') {
            const msg = JSON.parse(event.data);
            if (msg.type === 'pong' && this.pingTimestamp) {
              const rtt = Date.now() - this.pingTimestamp;
              const state: SidecarConnectionState =
                rtt > this.latencyThresholdMs ? 'high-latency' : 'connected';
              this.reconnectDelayMs = 2000;
              this.setStatus({ state, roundTripMs: rtt, authenticated: msg.authenticated ?? true });
            } else if (msg.type === 'sidecar_status') {
              if (msg.authRequired && !msg.authenticated) {
                this.setStatus({ state: 'auth-failed' });
              } else {
                this.setStatus({
                  state: 'connected',
                  authenticated: msg.authenticated ?? true,
                  serverVersion: msg.version,
                });
              }
            } else if (msg.type === 'AUTH_FAILED') {
              this.setStatus({ state: 'auth-failed' });
            } else if (
              msg.type === 'AUDIO_CHUNK' ||
              msg.type === 'AUDIO_FRAME' ||
              msg.type === 'audio'
            ) {
              if (this.aiAudioReceiver) {
                const seq = msg.sequenceNumber ?? msg.seq ?? this.receivedAudioSeq++;
                this.aiAudioReceiver.pushChunk(
                  msg.pcmData || msg.audio || msg.data,
                  seq,
                  msg.timestamp
                );
              }
            }
          } else if (event.data instanceof ArrayBuffer) {
            if (this.aiAudioReceiver) {
              const handled = this.aiAudioReceiver.pushBinaryChunk(event.data);
              if (!handled) {
                this.aiAudioReceiver.pushChunk(event.data, this.receivedAudioSeq++);
              }
            }
          } else if (typeof Blob !== 'undefined' && event.data instanceof Blob) {
            event.data.arrayBuffer().then((ab) => {
              if (this.aiAudioReceiver) {
                const handled = this.aiAudioReceiver.pushBinaryChunk(ab);
                if (!handled) {
                  this.aiAudioReceiver.pushChunk(ab, this.receivedAudioSeq++);
                }
              }
            });
          }
        } catch {
          // ignore malformed messages
        }
      };


      this.socket.onerror = () => {
        this.setStatus({ state: 'unavailable' });
      };

      this.socket.onclose = () => {
        this.setStatus({ state: 'unavailable' });
        this.scheduleReconnect();
      };
    } catch {
      this.setStatus({ state: 'unavailable' });
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.reconnectDelayMs = 2000;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
    this.setStatus({ state: 'unavailable' });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const currentDelay = this.reconnectDelayMs;
    this.reconnectDelayMs = Math.min(this.maxReconnectDelayMs, this.reconnectDelayMs * 2);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, currentDelay);
  }

  private setStatus(status: SidecarStatus) {
    this.sidecarStatus = status;
    this.statusListeners.forEach((cb) => cb(status));
  }

  public getStatus(): SidecarStatus {
    return this.sidecarStatus;
  }

  public getDebugFrameHistory(): ConditioningFrame[] {
    return this.debugFrameHistory;
  }

  public subscribeSidecarStatus(cb: StatusCallback): () => void {
    this.statusListeners.add(cb);
    cb(this.sidecarStatus);
    return () => this.statusListeners.delete(cb);
  }

  public subscribeFrames(cb: FrameCallback): () => void {
    this.frameListeners.add(cb);
    return () => this.frameListeners.delete(cb);
  }

  private notifyFrame(frame: ConditioningFrame) {
    this.frameListeners.forEach((cb) => cb(frame));
  }
}

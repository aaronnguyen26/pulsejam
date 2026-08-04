import { CloudVibeMetrics, CloudVibeStatus, DSPMetrics, LyriaControlParams } from '../audio/types';
import { TelemetryPromptMapper } from './TelemetryPromptMapper';
import { LyriaAudioStreamer } from './LyriaAudioStreamer';

const LOCAL_STORAGE_API_KEY = 'pulsejam_google_api_key';

type StatusCallback = (metrics: CloudVibeMetrics) => void;

interface ActiveSession {
  socket: WebSocket;
  streamer: LyriaAudioStreamer;
  startTime: number;
}

export class LyriaSessionManager {
  private ctx: AudioContext;
  private mapper: TelemetryPromptMapper;

  private primarySession: ActiveSession | null = null;
  private secondarySession: ActiveSession | null = null;

  private status: CloudVibeStatus = 'OFF';
  private errorMessage: string | null = null;

  private sessionTimerId: NodeJS.Timeout | null = null;
  private sessionElapsedSec = 0;
  private rotationCount = 0;

  private retryCount = 0;
  private maxRetries = 3;
  private isManualStop = false;

  private volume = 0.5;
  private listeners: Set<StatusCallback> = new Set();

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.mapper = new TelemetryPromptMapper();
  }

  // ─── BYOK API Key Helpers ───────────────────────────────────────────────

  public static getStoredApiKey(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(LOCAL_STORAGE_API_KEY);
  }

  public static setStoredApiKey(key: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCAL_STORAGE_API_KEY, key.trim());
  }

  public static clearStoredApiKey() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(LOCAL_STORAGE_API_KEY);
  }

  // ─── Connection Lifecycle Controls ─────────────────────────────────────

  public async start(): Promise<boolean> {
    const apiKey = LyriaSessionManager.getStoredApiKey();
    if (!apiKey) {
      this.setStatus('NO_KEY', 'No Google AI API Key found. Please add your API key in Settings.');
      return false;
    }

    this.isManualStop = false;
    this.retryCount = 0;
    this.rotationCount = 0;
    this.sessionElapsedSec = 0;

    return await this.connectSession(apiKey, false);
  }

  public stop() {
    this.isManualStop = true;
    this.stopSessionTimer();

    if (this.primarySession) {
      this.closeSession(this.primarySession);
      this.primarySession = null;
    }

    if (this.secondarySession) {
      this.closeSession(this.secondarySession);
      this.secondarySession = null;
    }

    this.setStatus('OFF', null);
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.primarySession) {
      this.primarySession.streamer.setVolume(this.volume);
    }
    if (this.secondarySession) {
      this.secondarySession.streamer.setVolume(this.volume);
    }
    this.notifyStatus();
  }

  public processDSPMetrics(metrics: DSPMetrics) {
    if (this.status !== 'CONNECTED' && this.status !== 'ROTATING') return;

    const params = this.mapper.processMetrics(metrics);
    this.sendLiveControlParams(params);
  }

  // ─── Internal WebSocket Session Management ──────────────────────────────

  private connectSession(apiKey: string, isRotation: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      this.setStatus(isRotation ? 'ROTATING' : 'CONNECTING', null);

      const endpoint = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(apiKey)}`;

      let socket: WebSocket;
      try {
        socket = new WebSocket(endpoint);
      } catch (err) {
        this.handleError('Failed to create WebSocket connection.', err);
        resolve(false);
        return;
      }

      const streamer = new LyriaAudioStreamer(this.ctx);
      streamer.setVolume(this.volume);

      const newSession: ActiveSession = {
        socket,
        streamer,
        startTime: Date.now(),
      };

      let isOpened = false;

      socket.onopen = () => {
        isOpened = true;
        this.retryCount = 0;

        // Send Initial Setup Frame to Lyria RealTime API
        const setupMsg = {
          setup: {
            model: 'models/lyria-realtime-exp',
            generationConfig: {
              responseModalities: ['AUDIO'],
            },
          },
        };
        socket.send(JSON.stringify(setupMsg));

        // Send initial live control prompt payload
        const initialParams = this.mapper.getCurrentParams();
        this.sendSessionParams(socket, initialParams);

        if (!isRotation) {
          this.primarySession = newSession;
          this.sessionElapsedSec = 0;
          this.startSessionTimer();
          this.setStatus('CONNECTED', null);
        } else {
          // Secondary rotation session ready
          this.secondarySession = newSession;
          this.performSessionCrossfade();
        }

        resolve(true);
      };

      socket.onmessage = (event) => {
        this.handleSocketMessage(newSession, event.data);
      };

      socket.onerror = (err) => {
        console.warn('Lyria WebSocket error:', err);
        if (!isOpened) {
          this.handleConnectionFailure(apiKey, isRotation, 'WebSocket connection error');
          resolve(false);
        }
      };

      socket.onclose = (event) => {
        if (this.isManualStop) return;

        if (event.code === 4001 || event.code === 4003 || event.code === 1008) {
          this.setStatus('ERROR', 'Invalid Google AI API key or unauthorized access.');
        } else if (event.code === 429) {
          this.setStatus('ERROR', 'Google AI API quota exceeded for your account.');
        } else if (this.status === 'CONNECTED' && !isRotation) {
          this.handleConnectionFailure(apiKey, false, `WebSocket closed unexpectedly (code ${event.code})`);
        }
      };
    });
  }

  private handleSocketMessage(session: ActiveSession, data: string | Blob | ArrayBuffer) {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);

        // Handle Base64 PCM Audio payload from Lyria RealTime API
        if (parsed.serverContent && parsed.serverContent.modelTurn && parsed.serverContent.modelTurn.parts) {
          for (const part of parsed.serverContent.modelTurn.parts) {
            if (part.inlineData && part.inlineData.data) {
              const binaryStr = atob(part.inlineData.data);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
              session.streamer.enqueuePCMChunk(bytes.buffer);
            }
          }
        }
      } catch {}
    } else if (data instanceof ArrayBuffer) {
      session.streamer.enqueuePCMChunk(data);
    }
  }

  private sendLiveControlParams(params: LyriaControlParams) {
    if (this.primarySession && this.primarySession.socket.readyState === WebSocket.OPEN) {
      this.sendSessionParams(this.primarySession.socket, params);
    }
    if (this.secondarySession && this.secondarySession.socket.readyState === WebSocket.OPEN) {
      this.sendSessionParams(this.secondarySession.socket, params);
    }
  }

  private sendSessionParams(socket: WebSocket, params: LyriaControlParams) {
    const promptSummary = params.prompts.map((p) => `${p.text}: ${p.weight}`).join(', ');
    const msg = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: `prompts: [${promptSummary}], density: ${params.density}, brightness: ${params.brightness}, bpm: 120`,
              },
            ],
          },
        ],
        turnComplete: true,
      },
    };

    try {
      socket.send(JSON.stringify(msg));
    } catch {}
  }

  // ─── 9-Minute Session Rotation Protocol ─────────────────────────────────

  private startSessionTimer() {
    this.stopSessionTimer();
    this.sessionTimerId = setInterval(() => {
      this.sessionElapsedSec += 1;
      this.notifyStatus();

      // Trigger 9-Minute Session Rotation (540 seconds)
      if (this.sessionElapsedSec >= 540 && this.status === 'CONNECTED') {
        this.rotateSession();
      }
    }, 1000);
  }

  private stopSessionTimer() {
    if (this.sessionTimerId) {
      clearInterval(this.sessionTimerId);
      this.sessionTimerId = null;
    }
  }

  private async rotateSession() {
    const apiKey = LyriaSessionManager.getStoredApiKey();
    if (!apiKey || this.status === 'ROTATING') return;

    this.setStatus('ROTATING', null);
    await this.connectSession(apiKey, true);
  }

  private performSessionCrossfade() {
    if (!this.primarySession || !this.secondarySession) return;

    const oldSession = this.primarySession;
    const newSession = this.secondarySession;

    // 500ms linear crossfade
    oldSession.streamer.fadeOutAndStop(500);

    setTimeout(() => {
      this.closeSession(oldSession);
      this.primarySession = newSession;
      this.secondarySession = null;
      this.rotationCount += 1;
      this.sessionElapsedSec = 0;
      this.setStatus('CONNECTED', null);
    }, 550);
  }

  private closeSession(session: ActiveSession) {
    try {
      session.socket.close();
    } catch {}
    session.streamer.destroy();
  }

  private handleConnectionFailure(apiKey: string, isRotation: boolean, reason: string) {
    if (this.isManualStop) return;

    this.retryCount += 1;
    if (this.retryCount <= this.maxRetries) {
      const backoffMs = Math.pow(2, this.retryCount - 1) * 1000;
      this.setStatus('CONNECTING', `Connection lost (${reason}). Retrying in ${backoffMs / 1000}s (Attempt ${this.retryCount}/${this.maxRetries})…`);

      setTimeout(() => {
        if (!this.isManualStop) {
          this.connectSession(apiKey, isRotation);
        }
      }, backoffMs);
    } else {
      this.setStatus('ERROR', `Cloud Vibe connection failed after ${this.maxRetries} retries: ${reason}`);
    }
  }

  private handleError(msg: string, err: unknown) {
    const errorText = err instanceof Error ? err.message : String(err);
    this.setStatus('ERROR', `${msg}: ${errorText}`);
  }

  public subscribeStatus(cb: StatusCallback): () => void {
    this.listeners.add(cb);
    this.notifyStatus();
    return () => this.listeners.delete(cb);
  }

  private notifyStatus() {
    const metrics: CloudVibeMetrics = {
      status: this.status,
      hasApiKey: !!LyriaSessionManager.getStoredApiKey(),
      sessionElapsedSec: this.sessionElapsedSec,
      rotationCount: this.rotationCount,
      activePrompts: this.mapper.getCurrentParams().prompts,
      density: this.mapper.getCurrentParams().density,
      brightness: this.mapper.getCurrentParams().brightness,
      volume: this.volume,
      errorMessage: this.errorMessage,
      retryCount: this.retryCount,
    };

    this.listeners.forEach((cb) => cb(metrics));
  }

  private setStatus(status: CloudVibeStatus, errorMessage: string | null = null) {
    this.status = status;
    this.errorMessage = errorMessage;
    this.notifyStatus();
  }
}

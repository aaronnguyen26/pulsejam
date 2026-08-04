import {
  AIGenerationLogEntry,
  AIGenerationMetrics,
  AppMode,
  AudioEngineStatus,
  AudioErrorType,
  CalibrationData,
  CloudVibeMetrics,
  DSPMetrics,
  LatencyLogEntry,
  MIDINoteEvent,
  OperatingMode,
  PerformanceTier,
  StemSourceType,
  TierChangeEvent,
} from './types';

import { StemEngine } from './StemEngine';
import { FileStemProvider, SyntheticStemProvider } from './StemProviders';
import { MIDISynthEngine } from './MIDISynthEngine';
import { AIGenerationEngine } from './AIGenerationEngine';
import { LyriaSessionManager } from '../lyria/LyriaSessionManager';

type MetricsCallback = (metrics: DSPMetrics) => void;
type LatencyCallback = (entry: LatencyLogEntry) => void;
type StatusCallback = (status: AudioEngineStatus) => void;
type AIGenMetricsCallback = (metrics: AIGenerationMetrics) => void;
type AIGenLogCallback = (entry: AIGenerationLogEntry) => void;
type CloudVibeMetricsCallback = (metrics: CloudVibeMetrics) => void;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;

  private stemEngine: StemEngine | null = null;
  private midiSynthEngine: MIDISynthEngine | null = null;
  private aiGenEngine: AIGenerationEngine | null = null;
  private lyriaManager: LyriaSessionManager | null = null;

  private currentAppMode: AppMode = 'stems';
  private currentProviderType: StemSourceType = 'synthetic';

  private status: AudioEngineStatus = {
    isInitialized: false,
    isMicActive: false,
    errorType: null,
    errorMessage: null,
  };

  private metricsListeners: Set<MetricsCallback> = new Set();
  private latencyListeners: Set<LatencyCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private aiGenMetricsListeners: Set<AIGenMetricsCallback> = new Set();
  private aiGenLogListeners: Set<AIGenLogCallback> = new Set();
  private cloudVibeListeners: Set<CloudVibeMetricsCallback> = new Set();

  private latencyHistory: LatencyLogEntry[] = [];

  constructor() {}

  public async initialize(stemSource: StemSourceType = 'synthetic'): Promise<boolean> {
    this.currentProviderType = stemSource;

    const isAudioContextSupported =
      typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
    if (!isAudioContextSupported) {
      this.setError('NOT_SUPPORTED', 'WebAudio API is not supported in this browser.');
      return false;
    }

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass({ latencyHint: 'interactive' });

      if (!this.ctx.audioWorklet) {
        this.setError('NOT_SUPPORTED', 'AudioWorklet API is not supported in this browser environment.');
        return false;
      }

      // 1. Initialize Stage 1 Stem Engine
      this.stemEngine = new StemEngine(this.ctx);
      await this.loadStems(stemSource);

      // 2. Initialize Stage 2 MIDI Synth & AI Generation Engines
      this.midiSynthEngine = new MIDISynthEngine(this.ctx);
      this.aiGenEngine = new AIGenerationEngine(this.ctx, this.midiSynthEngine);

      this.aiGenEngine.subscribeMetrics((metrics) => {
        this.aiGenMetricsListeners.forEach((cb) => cb(metrics));
      });
      this.aiGenEngine.subscribeLogs((entry) => {
        this.aiGenLogListeners.forEach((cb) => cb(entry));
      });

      await this.aiGenEngine.initializeWorker();

      // 3. Initialize Stage 3 Cloud Vibe Session Manager
      this.lyriaManager = new LyriaSessionManager(this.ctx);
      this.lyriaManager.subscribeStatus((metrics) => {
        this.cloudVibeListeners.forEach((cb) => cb(metrics));
      });

      // 4. Load AudioWorklet Processor Module
      await this.ctx.audioWorklet.addModule('/worklets/dsp-processor.js');

      // 5. Instantiate AudioWorkletNode
      this.workletNode = new AudioWorkletNode(this.ctx, 'pulsejam-dsp-processor');
      this.workletNode.port.onmessage = (event) => this.handleWorkletMessage(event.data);

      const dummyGain = this.ctx.createGain();
      dummyGain.gain.value = 0.0;
      this.workletNode.connect(dummyGain);
      dummyGain.connect(this.ctx.destination);

      this.setStatus({ isInitialized: true, errorType: null, errorMessage: null });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setError('INITIALIZATION_FAILED', `Failed to initialize Audio Engine: ${msg}`);
      return false;
    }
  }

  public async startMicrophone(): Promise<boolean> {
    if (!this.ctx || !this.workletNode) {
      this.setError('INITIALIZATION_FAILED', 'AudioEngine must be initialized before starting microphone.');
      return false;
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    };

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.setError('NOT_SUPPORTED', 'Microphone access is not supported by your browser.');
        return false;
      }

      this.micStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.micSourceNode = this.ctx.createMediaStreamSource(this.micStream);
      this.micSourceNode.connect(this.workletNode);

      // Start active mode playback
      if (this.currentAppMode === 'stems' && this.stemEngine) {
        this.stemEngine.start();
      } else if (this.currentAppMode === 'ai-gen' && this.aiGenEngine) {
        this.aiGenEngine.start();
      }

      this.setStatus({ isMicActive: true, errorType: null, errorMessage: null });
      return true;
    } catch (err: unknown) {
      const errorName = err && typeof err === 'object' && 'name' in err ? String(err.name) : '';
      const errorMsg = err instanceof Error ? err.message : String(err);

      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        this.setError('PERMISSION_DENIED', 'Microphone access was denied. Please allow microphone access in browser settings.');
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        this.setError('NO_DEVICE', 'No audio input device (microphone) was found on your system.');
      } else if (errorName === 'NotSupportedError') {
        this.setError('NOT_SUPPORTED', 'Requested microphone configuration is not supported.');
      } else {
        this.setError('INITIALIZATION_FAILED', `Microphone error: ${errorMsg}`);
      }
      return false;
    }
  }

  public stopMicrophone() {
    if (this.micSourceNode) {
      this.micSourceNode.disconnect();
      this.micSourceNode = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.stemEngine) {
      this.stemEngine.stop();
    }

    if (this.aiGenEngine) {
      this.aiGenEngine.stop();
    }

    this.setStatus({ isMicActive: false });
  }

  public setAppMode(appMode: AppMode) {
    this.currentAppMode = appMode;

    if (appMode === 'stems') {
      if (this.aiGenEngine) this.aiGenEngine.stop();
      if (this.midiSynthEngine) this.midiSynthEngine.setMuted(true);
      if (this.stemEngine && this.status.isMicActive) {
        this.stemEngine.start();
      }
    } else if (appMode === 'ai-gen') {
      if (this.stemEngine) this.stemEngine.stop();
      if (this.midiSynthEngine) this.midiSynthEngine.setMuted(false);
      if (this.aiGenEngine && this.status.isMicActive) {
        this.aiGenEngine.start();
      }
    }
  }

  public async switchStemSource(sourceType: StemSourceType): Promise<boolean> {
    if (!this.ctx || !this.stemEngine) return false;
    this.currentProviderType = sourceType;
    return await this.loadStems(sourceType);
  }

  private async loadStems(sourceType: StemSourceType): Promise<boolean> {
    if (!this.ctx || !this.stemEngine) return false;

    const provider = sourceType === 'synthetic' ? new SyntheticStemProvider() : new FileStemProvider();
    const stems = await provider.loadStems(this.ctx);
    this.stemEngine.initStems(stems);

    if (this.status.isMicActive && this.currentAppMode === 'stems') {
      this.stemEngine.start();
    }

    return true;
  }

  public setCalibration(calibration: CalibrationData) {
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: 'SET_CALIBRATION',
        payload: calibration,
      });
    }
  }

  public setOperatingMode(mode: OperatingMode, overrideTier?: PerformanceTier) {
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: 'SET_MODE',
        payload: { mode, overrideTier },
      });
    }
    if (mode === 'OVERRIDE' && overrideTier && this.stemEngine && this.currentAppMode === 'stems') {
      this.stemEngine.transitionToTier(overrideTier);
    }
  }

  // ─── Stage 3 Cloud Vibe API Methods ─────────────────────────────────────

  public async startCloudVibe(): Promise<boolean> {
    if (!this.lyriaManager) return false;
    return await this.lyriaManager.start();
  }

  public stopCloudVibe() {
    if (this.lyriaManager) {
      this.lyriaManager.stop();
    }
  }

  public setCloudVibeVolume(vol: number) {
    if (this.lyriaManager) {
      this.lyriaManager.setVolume(vol);
    }
  }

  public subscribeCloudVibe(cb: CloudVibeMetricsCallback): () => void {
    this.cloudVibeListeners.add(cb);
    return () => this.cloudVibeListeners.delete(cb);
  }

  private handleWorkletMessage(data: { type: string; payload: unknown }) {
    if (!data || !data.type) return;

    if (data.type === 'DSP_METRICS') {
      const metrics = data.payload as DSPMetrics;
      this.notifyMetrics(metrics);

      // 1. Forward buffered notes to Stage 2 AI Generation Engine
      if (metrics.bufferedNotes && this.aiGenEngine) {
        this.aiGenEngine.updateBufferedNotes(metrics.bufferedNotes as MIDINoteEvent[]);
      }

      // 2. Forward live DSP telemetry to Stage 3 Cloud Vibe Session Manager
      if (this.lyriaManager) {
        this.lyriaManager.processDSPMetrics(metrics);
      }
    } else if (data.type === 'TIER_CHANGE') {
      const event = data.payload as TierChangeEvent;
      if (this.stemEngine && this.currentAppMode === 'stems') {
        this.stemEngine.transitionToTier(event.newTier);
      }
      const entry: LatencyLogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        previousTier: event.previousTier,
        newTier: event.newTier,
        deltaMs: event.deltaMs,
        timestamp: Date.now(),
      };
      this.addLatencyLog(entry);
    }
  }

  private addLatencyLog(entry: LatencyLogEntry) {
    this.latencyHistory = [entry, ...this.latencyHistory].slice(0, 20);
    this.notifyLatency(entry);
  }

  public getLatencyHistory(): LatencyLogEntry[] {
    return this.latencyHistory;
  }

  public clearLatencyHistory() {
    this.latencyHistory = [];
  }

  public clearAIGenLogs() {
    if (this.aiGenEngine) this.aiGenEngine.clearLogs();
  }

  public subscribeMetrics(cb: MetricsCallback): () => void {
    this.metricsListeners.add(cb);
    return () => this.metricsListeners.delete(cb);
  }

  public subscribeLatency(cb: LatencyCallback): () => void {
    this.latencyListeners.add(cb);
    return () => this.latencyListeners.delete(cb);
  }

  public subscribeStatus(cb: StatusCallback): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  public subscribeAIGenMetrics(cb: AIGenMetricsCallback): () => void {
    this.aiGenMetricsListeners.add(cb);
    return () => this.aiGenMetricsListeners.delete(cb);
  }

  public subscribeAIGenLogs(cb: AIGenLogCallback): () => void {
    this.aiGenLogListeners.add(cb);
    return () => this.aiGenLogListeners.delete(cb);
  }

  private notifyMetrics(metrics: DSPMetrics) {
    this.metricsListeners.forEach((cb) => cb(metrics));
  }

  private notifyLatency(entry: LatencyLogEntry) {
    this.latencyListeners.forEach((cb) => cb(entry));
  }

  private notifyStatus() {
    this.statusListeners.forEach((cb) => cb(this.status));
  }

  private setStatus(partial: Partial<AudioEngineStatus>) {
    this.status = { ...this.status, ...partial };
    this.notifyStatus();
  }

  private setError(type: AudioErrorType, message: string) {
    this.setStatus({ errorType: type, errorMessage: message });
  }

  public getStatus(): AudioEngineStatus {
    return this.status;
  }

  public destroy() {
    this.stopMicrophone();
    this.stopCloudVibe();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    if (this.aiGenEngine) {
      this.aiGenEngine.destroy();
      this.aiGenEngine = null;
    }
    this.workletNode = null;
    this.stemEngine = null;
    this.midiSynthEngine = null;
    this.lyriaManager = null;
  }
}

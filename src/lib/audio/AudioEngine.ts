import {
  AIAudioStreamMetrics,
  AppMode,
  AudioEngineStatus,
  AudioErrorType,
  CalibrationData,
  DSPMetrics,
  LatencyLogEntry,
  OperatingMode,
  PerformanceTier,
  StemSourceType,
  TierChangeEvent,
} from './types';

import { StemEngine } from './StemEngine';
import { FileStemProvider, SyntheticStemProvider } from './StemProviders';
import { AIAudioReceiver } from './AIAudioReceiver';
import { useAudioSettingsStore } from '../state/audioSettingsStore';
import { useCalibrationStore } from '../state/calibrationStore';
import { ConditioningBridge } from './ConditioningBridge';
import { MasteringChain, MasteringOptions } from './MasteringChain';
import { ChordProgressionTracker, ChordEstimate } from './ChordProgressionTracker';
import { DynamicArranger, ArrangerState } from './DynamicArranger';

type MetricsCallback = (metrics: DSPMetrics) => void;
type LatencyCallback = (entry: LatencyLogEntry) => void;
type StatusCallback = (status: AudioEngineStatus) => void;
type AIAudioMetricsCallback = (metrics: AIAudioStreamMetrics) => void;
type _ChordCallback = (chord: ChordEstimate) => void;
type _ArrangerCallback = (state: ArrangerState) => void;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private biquadFilterNode: BiquadFilterNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private activeCalibration: CalibrationData | null = null;

  // Stage 1 Stem Engine
  private stemEngine: StemEngine | null = null;

  // Stage 2 MRT2 AI Audio Stream Receiver & Mixer Nodes
  private aiAudioReceiver: AIAudioReceiver;
  private micGainNode: GainNode | null = null;
  private micCompressorNode: DynamicsCompressorNode | null = null;
  private aiGainNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;

  // Phase 4: Mastering Chain & Harmonic Intelligence Engines
  private masteringChain: MasteringChain | null = null;
  private chordTracker: ChordProgressionTracker;
  private dynamicArranger: DynamicArranger;

  private conditioningBridge: ConditioningBridge | null = null;
  private pendingSnapshotResolver: ((samples: Float32Array) => void) | null = null;

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
  private aiAudioMetricsListeners: Set<AIAudioMetricsCallback> = new Set();

  private latencyHistory: LatencyLogEntry[] = [];

  constructor() {
    this.chordTracker = new ChordProgressionTracker();
    this.dynamicArranger = new DynamicArranger();
    this.aiAudioReceiver = new AIAudioReceiver();
    this.aiAudioReceiver.subscribeMetrics((metrics) => {
      this.aiAudioMetricsListeners.forEach((cb) => cb(metrics));
    });
  }

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

      // 2. Setup Stage 2 Mixer Stage & Phase 4 Mastering Chain
      this.masterGainNode = this.ctx.createGain();
      this.micGainNode = this.ctx.createGain();
      this.micCompressorNode = this.ctx.createDynamicsCompressor();
      this.aiGainNode = this.ctx.createGain();

      this.masterGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);
      // Default live mic monitoring gain to 0.0 (silent) on session start to avoid feedback
      this.micGainNode.gain.value = 0.0;
      this.micGainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.aiGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);

      // Phase 4: Instantiate 3-Band Neural Mastering Chain
      this.masteringChain = new MasteringChain(this.ctx);

      // DynamicsCompressor safety ceiling limiter tuned near 0dBFS (-2.0dB threshold, 2.0dB knee, 20:1 ratio)
      this.micCompressorNode.threshold.setValueAtTime(-2.0, this.ctx.currentTime);
      this.micCompressorNode.knee.setValueAtTime(2.0, this.ctx.currentTime);
      this.micCompressorNode.ratio.setValueAtTime(20, this.ctx.currentTime);
      this.micCompressorNode.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.micCompressorNode.release.setValueAtTime(0.1, this.ctx.currentTime);

      this.micGainNode.connect(this.micCompressorNode);
      this.micCompressorNode.connect(this.masterGainNode);

      // Route AI Output -> 3-Band Mastering Processor -> Master Gain
      this.aiGainNode.connect(this.masteringChain.getInputNode());
      this.masteringChain.getOutputNode().connect(this.masterGainNode);
      this.masterGainNode.connect(this.ctx.destination);

      // Initialize Stage 2 AIAudioReceiver WebAudio AudioWorklet
      const aiWorklet = await this.aiAudioReceiver.initializeAudioWorklet(this.ctx);
      if (aiWorklet) {
        aiWorklet.connect(this.aiGainNode);
      }

      // 3. Load AudioWorklet Processor Module for DSP
      await this.ctx.audioWorklet.addModule('/worklets/dsp-processor.js');

      // 5. Instantiate AudioWorkletNode
      this.workletNode = new AudioWorkletNode(this.ctx, 'pulsejam-dsp-processor');
      this.workletNode.port.onmessage = (event) => this.handleWorkletMessage(event.data);

      const dummyGain = this.ctx.createGain();
      dummyGain.gain.value = 0.0;
      this.workletNode.connect(dummyGain);
      dummyGain.connect(this.ctx.destination);

      // Subscribe to audio settings store changes for real-time reactivity
      useAudioSettingsStore.subscribe((state, prevState) => {
        if (state.inputGainDb !== prevState.inputGainDb) {
          this.setInputGainDb(state.inputGainDb);
        }
        if (state.lowCutFilter !== prevState.lowCutFilter) {
          this.setLowCutFilter(state.lowCutFilter);
        }
        if (
          state.selectedDeviceId !== prevState.selectedDeviceId ||
          state.inputMode !== prevState.inputMode
        ) {
          if (this.status.isMicActive) {
            this.restartMicrophone();
          }
        }
      });

      // Auto-restore persisted calibration data from Zustand store
      const savedCal = useCalibrationStore.getState().calibration;
      if (savedCal) {
        this.setCalibration(savedCal);
      }

      this.setStatus({ isInitialized: true, errorType: null, errorMessage: null });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setError('INITIALIZATION_FAILED', `Failed to initialize Audio Engine: ${msg}`);
      return false;
    }
  }

  public async startMicrophone(): Promise<boolean> {
    if (this.status.isMicActive && this.micStream && this.micSourceNode) {
      return true;
    }

    if (!this.ctx || !this.workletNode) {
      this.setError('INITIALIZATION_FAILED', 'AudioEngine must be initialized before starting microphone.');
      return false;
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const settings = useAudioSettingsStore.getState();
    const isAcoustic = settings.inputMode === 'acoustic';

    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: settings.selectedDeviceId ? { exact: settings.selectedDeviceId } : undefined,
        echoCancellation: isAcoustic,
        noiseSuppression: isAcoustic,
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

      // GainNode & BiquadFilterNode (Stage 1 DSP path)
      this.gainNode = this.ctx.createGain();
      const linearGain = Math.max(0, Math.pow(10, settings.inputGainDb / 20));
      this.gainNode.gain.setValueAtTime(linearGain, this.ctx.currentTime);

      this.biquadFilterNode = this.ctx.createBiquadFilter();
      this.biquadFilterNode.type = 'highpass';
      this.biquadFilterNode.frequency.setValueAtTime(settings.lowCutFilter ? 80 : 0, this.ctx.currentTime);

      // Stage 1 DSP Path (silent, drives worklet processing clock):
      // micSourceNode -> gainNode (inputGainDb) -> biquadFilterNode -> workletNode -> dummyGain(0.0) -> destination
      this.micSourceNode.connect(this.gainNode);
      this.gainNode.connect(this.biquadFilterNode);
      this.biquadFilterNode.connect(this.workletNode);

      // Live Monitoring Path (taps micSourceNode directly BEFORE inputGainDb):
      // micSourceNode -> micGainNode (default 0.0) -> micCompressorNode (limiter) -> masterGainNode -> destination
      if (this.micGainNode) {
        this.micSourceNode.connect(this.micGainNode);
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

  public setInputGainDb(db: number) {
    if (this.gainNode && this.ctx) {
      const linearGain = Math.max(0, Math.pow(10, db / 20));
      this.gainNode.gain.setValueAtTime(linearGain, this.ctx.currentTime);

      if (this.activeCalibration && typeof this.activeCalibration.calibratedAtGainDb === 'number') {
        const gainDelta = db - this.activeCalibration.calibratedAtGainDb;
        const adjustedQuiet = Math.min(-15, Math.max(-75, Math.round(this.activeCalibration.quietDb + gainDelta)));
        const adjustedLoud = Math.min(-1, Math.max(-25, Math.round(this.activeCalibration.loudDb + gainDelta)));
        const adjustedNormal = Math.round((adjustedQuiet + adjustedLoud) / 2);

        if (this.workletNode) {
          this.workletNode.port.postMessage({
            type: 'SET_CALIBRATION',
            payload: {
              ...this.activeCalibration,
              quietDb: adjustedQuiet,
              normalDb: adjustedNormal,
              loudDb: adjustedLoud,
            },
          });
        }
      }
    }
  }

  public setLowCutFilter(enabled: boolean) {
    if (this.biquadFilterNode && this.ctx) {
      this.biquadFilterNode.frequency.setValueAtTime(enabled ? 80 : 0, this.ctx.currentTime);
    }
  }

  // ─── Stage 2 Mixer Gain Controls ──────────────────────────────────────────

  public setMicMixGain(gain: number) {
    if (this.micGainNode && this.ctx) {
      const val = Math.max(0, gain);
      this.micGainNode.gain.value = val;
      this.micGainNode.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  public setAIAudioMixGain(gain: number) {
    if (this.aiGainNode && this.ctx) {
      const val = Math.max(0, gain);
      this.aiGainNode.gain.value = val;
      this.aiGainNode.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  public setMasterGain(gain: number) {
    if (this.masterGainNode && this.ctx) {
      const val = Math.max(0, gain);
      this.masterGainNode.gain.value = val;
      this.masterGainNode.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }


  public getMicMixGain(): number {
    return this.micGainNode?.gain.value ?? 0.0;
  }


  public getAIAudioMixGain(): number {
    return this.aiGainNode?.gain.value ?? 1.0;
  }

  public getMasterGain(): number {
    return this.masterGainNode?.gain.value ?? 1.0;
  }

  public async restartMicrophone(): Promise<boolean> {
    if (this.status.isMicActive) {
      this.stopMicrophone();
      return await this.startMicrophone();
    }
    return true;
  }

  public stopMicrophone() {
    if (this.biquadFilterNode) {
      this.biquadFilterNode.disconnect();
      this.biquadFilterNode = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

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

    this.setStatus({ isMicActive: false });
  }

  public getMicStream(): MediaStream | null {
    return this.micStream;
  }

  public getAIAudioReceiver(): AIAudioReceiver {
    return this.aiAudioReceiver;
  }

  public setAppMode(appMode: AppMode) {
    this.currentAppMode = appMode;

    if (appMode === 'stems') {
      if (this.stemEngine && this.status.isMicActive) {
        this.stemEngine.start();
      }
    } else if (appMode === 'ai-gen') {
      if (this.stemEngine) this.stemEngine.stop();
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
    this.activeCalibration = calibration;
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: 'SET_CALIBRATION',
        payload: calibration,
      });
    }
    if (this.conditioningBridge && calibration.conditioningMode) {
      this.conditioningBridge.setCalibrationCeiling(calibration.conditioningMode);
    }
  }

  public getActiveCalibration(): CalibrationData | null {
    return this.activeCalibration;
  }

  public setConditioningBridge(bridge: ConditioningBridge | null) {
    this.conditioningBridge = bridge;
    if (bridge) {
      bridge.setAIAudioReceiver(this.aiAudioReceiver);
      if (this.activeCalibration && this.activeCalibration.conditioningMode) {
        bridge.setCalibrationCeiling(this.activeCalibration.conditioningMode);
      }
    }
  }

  public getConditioningBridge(): ConditioningBridge | null {
    return this.conditioningBridge;
  }

  public getAudioSnapshot(): Promise<Float32Array> {
    return new Promise((resolve) => {
      if (!this.workletNode) {
        resolve(new Float32Array(0));
        return;
      }
      this.pendingSnapshotResolver = resolve;
      this.workletNode.port.postMessage({ type: 'GET_AUDIO_SNAPSHOT', requestId: Date.now() });
    });
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

  private handleWorkletMessage(data: { type: string; payload: unknown }) {
    if (!data || !data.type) return;

    if (data.type === 'DSP_METRICS') {
      const metrics = data.payload as DSPMetrics;
      metrics.wallClockTimestamp = Date.now();
      this.notifyMetrics(metrics);

      if (this.conditioningBridge) {
        this.conditioningBridge.processMetrics(metrics);
      }
    } else if (data.type === 'AUDIO_SNAPSHOT') {
      const payload = data.payload as { samples: Float32Array | number[] };
      if (this.pendingSnapshotResolver) {
        const samples =
          payload.samples instanceof Float32Array
            ? payload.samples
            : new Float32Array(payload.samples);
        this.pendingSnapshotResolver(samples);
        this.pendingSnapshotResolver = null;
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

  public subscribeAIAudioMetrics(cb: AIAudioMetricsCallback): () => void {
    this.aiAudioMetricsListeners.add(cb);
    return () => this.aiAudioMetricsListeners.delete(cb);
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

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getMasteringChain(): MasteringChain | null {
    return this.masteringChain;
  }

  public getChordTracker(): ChordProgressionTracker {
    return this.chordTracker;
  }

  public getDynamicArranger(): DynamicArranger {
    return this.dynamicArranger;
  }

  public setMasteringOptions(options: MasteringOptions): void {
    if (!this.masteringChain) return;
    if (typeof options.enableWarmth === 'boolean') {
      if (!options.enableWarmth) this.masteringChain.setWarmth(0.0);
    }
    if (typeof options.warmthAmount === 'number') {
      this.masteringChain.setWarmth(options.warmthAmount);
    }
    if (typeof options.stereoWidth === 'number') {
      this.masteringChain.setStereoWidth(options.stereoWidth);
    }
    if (typeof options.reverbWet === 'number') {
      this.masteringChain.setReverbWet(options.reverbWet);
    }
    if (options.reverbSpace) {
      this.masteringChain.setReverbSpace(options.reverbSpace);
    }
    if (typeof options.limiterCeilingDb === 'number') {
      this.masteringChain.setLimiterCeiling(options.limiterCeilingDb);
    }
  }

  public setMasterVolume(vol: number): void {
    if (this.masterGainNode && this.ctx) {
      const v = Math.max(0, Math.min(2.0, vol));
      this.masterGainNode.gain.setValueAtTime(v, this.ctx.currentTime);
    }
  }

  public destroy() {
    this.stopMicrophone();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.aiAudioReceiver.reset();
    this.workletNode = null;
    this.stemEngine = null;
  }
}

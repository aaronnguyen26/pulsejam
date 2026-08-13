/**
 * PulseJam Audio, State, AI Generation & Cloud Vibe Types
 */

export type PerformanceTier = 'chill' | 'groove' | 'peak';

export type OperatingMode = 'LIVE' | 'CALIBRATING' | 'OVERRIDE';

export type AppMode = 'stems' | 'ai-gen';

export interface CalibrationData {
  quietDb: number;
  normalDb: number;
  loudDb: number;
  onsetThreshold: number;
  pitchConfidenceScore?: number; // 0..100 composite confidence percentage
  isPitchVerified?: boolean;     // whether phrase detection hard gate passed
  calibratedAtGainDb?: number;   // inputGainDb value at time of calibration
  pitchRangeLow?: number;        // lowest detected pitch (MIDI note 0..127)
  pitchRangeHigh?: number;       // highest detected pitch (MIDI note 0..127)
  toneSampleRef?: string | null; // reference key pointing to audio clip in IndexedDB
  conditioningMode?: 'midi+audio' | 'audio-only'; // calibration mode ceiling
}

export interface ConditioningFrame {
  pitchState: number[]; // 128-length array following General MIDI note numbering (-1=masked/unconditioned, 0=off, 1=sustain, 2=onset, 3=free play)
  stylePrompt: string;  // derived from current tier
  timestamp: number;    // frame timestamp (ms)
  mode: 'midi+audio' | 'audio-only'; // live-gated mode
}

export type SidecarConnectionState = 'unavailable' | 'connecting' | 'connected' | 'high-latency';

export interface SidecarStatus {
  state: SidecarConnectionState;
  roundTripMs?: number;
}

export type AIAudioStreamState = 'idle' | 'buffering' | 'streaming' | 'stalled';

export interface AIAudioStreamMetrics {
  state: AIAudioStreamState;
  bufferDepthMs: number;
  bufferDepthChunks: number;
  underrunCount: number;
  lastChunkTimestamp: number;
}


export interface DSPMetrics {
  rawRmsDb: number;
  smoothedRmsDb: number;
  rawOnsetDensity: number;
  smoothedOnsetDensity: number;
  activeTier: PerformanceTier;
  candidateTier: PerformanceTier;
  mode: OperatingMode;
  calibration: CalibrationData;
  timestamp: number;
  wallClockTimestamp?: number;
  peakAmplitude?: number;
  // Stage 2 Monophonic Pitch Additions
  currentPitch?: number | null;     // MIDI note (e.g. 60 = C4)
  currentFrequency?: number | null; // Hz (e.g. 261.63)
  pitchConfidence?: number;        // YIN clarity 0..1
}

export interface LatencyLogEntry {
  id: string;
  previousTier: PerformanceTier;
  newTier: PerformanceTier;
  deltaMs: number;
  timestamp: number;
}



export interface TierChangeEvent {
  previousTier: PerformanceTier;
  newTier: PerformanceTier;
  deltaMs: number;
  timestamp: number;
}

export interface StemBuffers {
  chill: AudioBuffer;
  groove: AudioBuffer;
  peak: AudioBuffer;
}

export type StemSourceType = 'synthetic' | 'files';

export interface IStemProvider {
  name: string;
  loadStems(ctx: AudioContext): Promise<StemBuffers>;
}

export type AudioErrorType = 'PERMISSION_DENIED' | 'NO_DEVICE' | 'NOT_SUPPORTED' | 'INITIALIZATION_FAILED' | null;

export interface AudioEngineStatus {
  isInitialized: boolean;
  isMicActive: boolean;
  errorType: AudioErrorType;
  errorMessage: string | null;
}

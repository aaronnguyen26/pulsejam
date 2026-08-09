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


export interface MIDINoteEvent {
  pitch: number;      // MIDI pitch 0..127
  velocity: number;   // Normalized velocity 0..1
  startTime: number;  // Seconds from start of reference
  duration: number;   // Duration in seconds
  quantizedStartStep?: number;
  quantizedEndStep?: number;
}

export interface NoteSequencePayload {
  notes: MIDINoteEvent[];
  totalTime: number;
  qpm: number;
  quantizationInfo?: { stepsPerQuarter: number };
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
  bufferedNotes?: MIDINoteEvent[];
}

export interface LatencyLogEntry {
  id: string;
  previousTier: PerformanceTier;
  newTier: PerformanceTier;
  deltaMs: number;
  timestamp: number;
}

export interface AIGenerationLogEntry {
  id: string;
  barIndex: number;
  generationLatencyMs: number;
  isFallback: boolean;
  timestamp: number;
  drumNotesCount: number;
  melodyNotesCount: number;
}

export interface AIGenerationMetrics {
  appMode: AppMode;
  isWorkerReady: boolean;
  currentPitch: number | null;
  activeNoteName: string | null;
  lastGenLatencyMs: number | null;
  medianGenLatencyMs: number | null;
  isFallbackActive: boolean;
  totalBarsGenerated: number;
}

// ─── Stage 3: Cloud Vibe Layer Types ───────────────────────────────────────

export type CloudVibeStatus =
  | 'OFF'
  | 'NO_KEY'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ROTATING'
  | 'ERROR';

export interface WeightedPrompt {
  text: string;
  weight: number;
}

export interface LyriaControlParams {
  prompts: WeightedPrompt[];
  density: number;    // 0.0 to 1.0
  brightness: number; // 0.0 to 1.0
  bpm: number;        // 120
}

export interface CloudVibeMetrics {
  status: CloudVibeStatus;
  hasApiKey: boolean;
  sessionElapsedSec: number;
  rotationCount: number;
  activePrompts: WeightedPrompt[];
  density: number;
  brightness: number;
  volume: number;
  errorMessage: string | null;
  retryCount: number;
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

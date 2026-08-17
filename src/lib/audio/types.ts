/**
 * PulseJam Audio, State, AI Generation & Cloud Vibe Types
 */

export type PerformanceTier = 'chill' | 'groove' | 'peak';

export type OperatingMode = 'LIVE' | 'CALIBRATING' | 'OVERRIDE';

export type AppMode = 'stems' | 'ai-gen';

// ─── Binary Protocol Constants & Enums ──────────────────────────────────────
export const BINARY_MAGIC = 0x504a; // 'PJ' in ASCII (0x50, 0x4A)
export const BINARY_HEADER_SIZE = 16; // 16-byte fixed header

export enum BinaryMessageType {
  AUDIO_CHUNK = 0x0001,
  PING = 0x0002,
  PONG = 0x0003,
  AUTH_CHALLENGE = 0x0004,
  AUTH_RESPONSE = 0x0005,
  CONFIG = 0x0006,
}

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
  stylePrompt: string;  // derived from current tier or active style preset
  timestamp: number;    // frame timestamp (ms)
  mode: 'midi+audio' | 'audio-only'; // live-gated mode
  // Phase 2 Harmonic & Rhythmic Extensions
  chromaVector?: number[]; // 12-element Pitch Class Profile (C to B)
  estimatedKey?: string;   // e.g. "A Minor", "C Major", "E Dorian"
  estimatedBpm?: number;   // Real-time detected tempo (e.g. 120.5)
}

export type SidecarConnectionState = 'unavailable' | 'connecting' | 'connected' | 'high-latency' | 'auth-failed';

export interface SidecarStatus {
  state: SidecarConnectionState;
  roundTripMs?: number;
  authenticated?: boolean;
  serverVersion?: string;
}

export type AIAudioStreamState = 'idle' | 'buffering' | 'streaming' | 'stalled';

export interface AIAudioStreamMetrics {
  state: AIAudioStreamState;
  bufferDepthMs: number;
  bufferDepthChunks: number;
  underrunCount: number;
  lastChunkTimestamp: number;
  isBinaryStream?: boolean;
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
  // Phase 2 Harmonic & Rhythmic Additions
  chromaVector?: number[];         // 12-element Chroma array
  estimatedKey?: string;           // Key center name
  detectedBpm?: number;            // Current detected tempo
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

// ─── Phase 2: Style Preset Types ────────────────────────────────────────────
export interface StylePreset {
  id: string;
  name: string;
  category: 'Lo-Fi' | 'Rock' | 'Soul' | 'Electronic' | 'Ambient' | 'Jazz';
  description: string;
  tags: string[];
  tierPrompts: Record<PerformanceTier, string>;
  defaultBpm: number;
  colorAccent: string;
}

// ─── Phase 3: Hardware & Export Types ───────────────────────────────────────
export interface MIDIFootswitchAction {
  ccNumber: number;
  action: 'TOGGLE_RECORD' | 'TIER_UP' | 'TIER_DOWN' | 'COUNT_IN' | 'MUTE_MIC' | 'MUTE_AI';
  label: string;
}

export interface JamTakeMetadata {
  takeId: string;
  takeNumber: number;
  startTime: number;
  durationMs: number;
  sampleRate: number;
  channelCount: number;
  blobUrl?: string;
  fileSizeEstimate: number;
}

// ─── Phase 4: Mastering & Harmonic Intelligence Types ───────────────────────
export interface MasteringOptions {
  enableWarmth?: boolean;
  warmthAmount?: number; // 0.0 - 1.0 (tube drive)
  enableLimiter?: boolean;
  limiterCeilingDb?: number; // default -0.1 dB
  enableStereoWidener?: boolean;
  stereoWidth?: number; // 0.0 (mono) - 2.0 (super-wide)
  enableReverb?: boolean;
  reverbWet?: number; // 0.0 - 1.0
  reverbSpace?: 'studio' | 'plate' | 'ambient';
}

export type ChordQuality =
  | 'Major'
  | 'Minor'
  | '7th'
  | 'Maj7'
  | 'Min7'
  | 'Dim'
  | 'Sus4'
  | 'Unknown';

export interface ChordEstimate {
  rootNoteName: string;
  rootMidiPitch: number;
  quality: ChordQuality;
  chordSymbol: string;
  confidence: number;
  romanNumeral: string;
  recommendedScales: string[];
  harmonicTension: number;
}

export type SongSection =
  | 'intro'
  | 'verse'
  | 'preChorus'
  | 'chorus'
  | 'solo'
  | 'breakdown'
  | 'outro';

export type RhythmicFeel = 'standard' | 'halfTime' | 'doubleTime';

export interface ArrangerState {
  currentSection: SongSection;
  currentBar: number;
  currentBeat: number;
  totalBarsPlayed: number;
  feel: RhythmicFeel;
  isFillQueued: boolean;
  isFillActive: boolean;
  energyLevel: number;
  sectionProgress: number;
}



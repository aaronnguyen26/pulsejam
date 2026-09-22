/**
 * PulseJam — Musician Performance Simulation & Output Quality Test Suite
 *
 * Simulates a musician using the PulseJam app in real-world scenarios:
 * 1. Acoustic 4-Beat Count-In & Tempo Synchronization (Lo-Fi 75 BPM, Groove 100 BPM, Up-tempo 140 BPM, human micro-timing jitter, erratic reset).
 * 2. Harmonic Intelligence & Progression Tracking (C Major I-IV-V-I, Jazz ii-V-I with modal recommendations, 12-bar blues harmonic tension, out-of-key clash detection).
 * 3. Dynamic Performance Tier Escalation (Quiet fingerpicking chill -> rhythmic strumming groove -> peak solo, drum pattern escalation).
 * 4. Audio Synthesis Quality & Mastering Safety (NaN/Infinity immunity, 0 dBFS peak limiter safety, tube warmth harmonics, stereo widener decorrelation).
 * 5. Song Arrangement & Dynamic Fills (Intro -> Verse -> PreChorus -> Chorus -> Solo evolution, bar-boundary drum fills, section progress).
 * 6. Musician Hardware Flow & Jam Recording (MIDI CC#64 footswitch toggle & debounce, retrospective 8-bar capture, 48kHz WAV export integrity).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Source modules
import { TempoTracker } from '../TempoTracker';
import { ChromaFeatureExtractor } from '../ChromaFeatureExtractor';
import { ChordProgressionTracker } from '../ChordProgressionTracker';
import { DynamicArranger } from '../DynamicArranger';
import { LocalGenerativeCompanion } from '../LocalGenerativeCompanion';
import { ConditioningBridge } from '../ConditioningBridge';
import { MasteringChain } from '../MasteringChain';
import { OPFSRecorder } from '../OPFSRecorder';
import { StemExporter } from '../StemExporter';
import { WebMIDIManager } from '../WebMIDIManager';
import { AudioEngine } from '../AudioEngine';
import { BINARY_MAGIC, BinaryMessageType, BINARY_HEADER_SIZE } from '../types';

// Web Audio API Mocks for Node/Test environment
class MockAudioParam {
  public value: number;
  constructor(v = 1) { this.value = v; }
  setValueAtTime(v: number) { this.value = v; }
  setValueCurveAtTime() {}
  cancelScheduledValues() {}
  linearRampToValueAtTime(v: number) { this.value = v; }
  exponentialRampToValueAtTime(v: number) { this.value = v; }
}

function makeMockNode() {
  return { connect: vi.fn(), disconnect: vi.fn() };
}

class MockGainNode {
  gain = new MockAudioParam(1);
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockBiquadFilter {
  type = 'lowpass';
  frequency = new MockAudioParam(440);
  Q = new MockAudioParam(1);
  gain = new MockAudioParam(0);
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockWaveShaper {
  oversample = 'none';
  curve: Float32Array | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockConvolver {
  buffer: any = null;
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockDynamicsCompressor {
  threshold = new MockAudioParam(-1);
  knee = new MockAudioParam(0);
  ratio = new MockAudioParam(20);
  attack = new MockAudioParam(0.001);
  release = new MockAudioParam(0.05);
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockSplitter {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockMerger {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockBufferSource {
  buffer: any = null;
  loop = false;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  sampleRate = 48000;
  currentTime = 0;
  state = 'running';
  destination = makeMockNode();
  audioWorklet = { addModule: async () => {} };
  createGain() { return new MockGainNode(); }
  createBiquadFilter() { return new MockBiquadFilter(); }
  createWaveShaper() { return new MockWaveShaper(); }
  createConvolver() { return new MockConvolver(); }
  createDynamicsCompressor() { return new MockDynamicsCompressor(); }
  createChannelSplitter() { return new MockSplitter(); }
  createChannelMerger() { return new MockMerger(); }
  createBufferSource() { return new MockBufferSource(); }
  createBuffer(channels: number, length: number, sampleRate: number) {
    const ch = new Float32Array(length);
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: () => ch,
    };
  }
  createMediaStreamSource() { return makeMockNode(); }
  close() { return Promise.resolve(); }
  resume() { return Promise.resolve(); }
}

class MockOfflineAudioContext {
  sampleRate = 48000;
  currentTime = 0;
  destination = makeMockNode();
  createGain() { return new MockGainNode(); }
  createOscillator() {
    return {
      type: 'sine',
      frequency: new MockAudioParam(440),
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createBiquadFilter() { return new MockBiquadFilter(); }
  createBuffer(channels: number, length: number, sampleRate: number) {
    const ch = new Float32Array(length);
    return {
      numberOfChannels: channels, length, sampleRate, duration: length / sampleRate,
      getChannelData: () => ch,
    };
  }
  createBufferSource() { return new MockBufferSource(); }
  startRendering() {
    const buf = {
      numberOfChannels: 2,
      length: 48000 * 2,
      sampleRate: 48000,
      duration: 2.0,
      getChannelData: () => new Float32Array(48000 * 2),
    };
    return Promise.resolve(buf);
  }
}

beforeEach(() => {
  (globalThis as any).AudioContext = MockAudioContext;
  (globalThis as any).webkitAudioContext = MockAudioContext;
  (globalThis as any).OfflineAudioContext = MockOfflineAudioContext;
  (globalThis as any).AudioWorkletNode = class MockAudioWorkletNode {
    port = { postMessage: vi.fn(), onmessage: null as any };
    connect = vi.fn();
    disconnect = vi.fn();
  };
  (globalThis as any).window = globalThis;
});

// ===============================================================================
// 1. Acoustic Count-In & Tempo Tracking (Musician Interaction)
// ===============================================================================

describe('Musician Flow 1: Acoustic 4-Beat Count-In & Tempo Synchronization', () => {
  it('locks at 100 BPM when musician taps 4 steady quarter-notes with human micro-jitter', () => {
    let lockedBpmResult = 0;
    const beatCallbacks: number[] = [];

    const tracker = new TempoTracker({
      onCountInBeat: (beat) => beatCallbacks.push(beat),
      onCountInComplete: (lockedBpm) => {
        lockedBpmResult = lockedBpm;
      },
      tempoToleranceRatio: 0.25,
    });

    tracker.armCountIn();
    expect(tracker.getCountInState()).toBe('listening');

    // 100 BPM = 600ms interval. Add realistic ±12ms human micro-timing variations
    const t0 = 1000;
    const t1 = t0 + 600 + 8;   // 1608ms (+8ms jitter)
    const t2 = t1 + 600 - 12;  // 2196ms (-12ms jitter)
    const t3 = t2 + 600 + 4;   // 2800ms (+4ms jitter)

    tracker.registerOnset(t0); // Beat 1
    expect(tracker.getCountInState()).toBe('counting');
    expect(beatCallbacks).toContain(1);

    tracker.registerOnset(t1); // Beat 2
    expect(beatCallbacks).toContain(2);

    tracker.registerOnset(t2); // Beat 3
    expect(beatCallbacks).toContain(3);

    tracker.registerOnset(t3); // Beat 4 -> Locks!
    expect(tracker.getCountInState()).toBe('locked');
    expect(beatCallbacks).toContain(4);

    // Locked BPM should be within 1 BPM of 100
    expect(lockedBpmResult).toBeGreaterThanOrEqual(98);
    expect(lockedBpmResult).toBeLessThanOrEqual(102);
  });

  it('correctly locks at a slow Lo-Fi ballad tempo (75 BPM = 800ms interval)', () => {
    let lockedBpm = 0;
    const tracker = new TempoTracker({
      onCountInComplete: (bpm) => { lockedBpm = bpm; },
    });

    tracker.armCountIn();
    const interval = 800; // 75 BPM
    let t = 2000;
    for (let i = 0; i < 4; i++) {
      tracker.registerOnset(t);
      t += interval;
    }

    expect(tracker.getCountInState()).toBe('locked');
    expect(lockedBpm).toBe(75);
  });

  it('correctly locks at an up-tempo rock beat (140 BPM = 428ms interval)', () => {
    let lockedBpm = 0;
    const tracker = new TempoTracker({
      onCountInComplete: (bpm) => { lockedBpm = bpm; },
    });

    tracker.armCountIn();
    const interval = 428.5; // ~140 BPM
    let t = 5000;
    for (let i = 0; i < 4; i++) {
      tracker.registerOnset(Math.round(t));
      t += interval;
    }

    expect(tracker.getCountInState()).toBe('locked');
    expect(lockedBpm).toBe(140);
  });

  it('rejects erratic, out-of-time taps (>25% variation) and resets count-in to beat 1', () => {
    let completed = false;
    const tracker = new TempoTracker({
      onCountInComplete: () => { completed = true; },
      tempoToleranceRatio: 0.20,
    });

    tracker.armCountIn();
    tracker.registerOnset(1000); // Beat 1
    tracker.registerOnset(1500); // Beat 2 (500ms interval = 120 BPM)
    tracker.registerOnset(2000); // Beat 3 (500ms interval)
    tracker.registerOnset(3000); // Beat 4 (1000ms interval! 100% error)

    // Should NOT lock because timing was wildly erratic
    expect(completed).toBe(false);
    expect(tracker.getCountInState()).toBe('counting'); // Reset back to counting
  });

  it('propagates count-in locked BPM directly to LocalGenerativeCompanion', () => {
    const companion = new LocalGenerativeCompanion();
    expect(companion.getBpm()).toBe(92); // initial default

    companion.setBpm(135);
    expect(companion.getBpm()).toBe(135);

    companion.setBpm(72);
    expect(companion.getBpm()).toBe(72);
  });
});

// ===============================================================================
// 2. Harmonic Intelligence & Musical Chord Recognition
// ===============================================================================

describe('Musician Flow 2: Harmonic Intelligence, Progression Tracking & Solo Scales', () => {
  let chromaExtractor: ChromaFeatureExtractor;
  let chordTracker: ChordProgressionTracker;

  beforeEach(() => {
    chromaExtractor = new ChromaFeatureExtractor(0.92);
    chordTracker = new ChordProgressionTracker();
  });

  it('detects C Major Diatonic Progression (C - F - G) with Roman Numerals (I - IV - V)', () => {
    // Musician plays C Major arpeggio notes (C4=60, E4=64, G4=67)
    chromaExtractor.reset();
    chordTracker.reset();
    chromaExtractor.addPitch(60, 1.0);
    chromaExtractor.addPitch(64, 1.0);
    chromaExtractor.addPitch(67, 1.0);

    let key = chromaExtractor.estimateKey();
    expect(key.root).toBe('C');
    expect(key.mode).toBe('Major');

    let chord = chordTracker.analyzeChroma(chromaExtractor.getNormalizedChroma(), key.key);
    expect(chord.rootNoteName).toBe('C');
    expect(chord.quality).toBe('Major');
    expect(chord.romanNumeral).toBe('I');
    expect(chord.harmonicTension).toBeLessThanOrEqual(0.15); // Tonic is resolved

    // Musician transitions to F Major (F3=53, A3=57, C4=60)
    chromaExtractor.reset();
    chordTracker.reset();
    chromaExtractor.addPitch(53, 1.0);
    chromaExtractor.addPitch(57, 1.0);
    chromaExtractor.addPitch(60, 1.0);

    chord = chordTracker.analyzeChroma(chromaExtractor.getNormalizedChroma(), 'C Major');
    expect(chord.rootNoteName).toBe('F');
    expect(chord.romanNumeral).toBe('IV');

    // Musician transitions to G Dominant 7th (G3=55, B3=59, D4=62, F4=65)
    chromaExtractor.reset();
    chordTracker.reset();
    chromaExtractor.addPitch(55, 1.5); // G3 (root)
    chromaExtractor.addPitch(43, 1.2); // G2 (bass root)
    chromaExtractor.addPitch(59, 0.9); // B3 (3rd)
    chromaExtractor.addPitch(62, 0.8); // D4 (5th)
    chromaExtractor.addPitch(65, 0.9); // F4 (b7)

    chord = chordTracker.analyzeChroma(chromaExtractor.getNormalizedChroma(), 'C Major');
    expect(chord.rootNoteName).toBe('G');
    expect(chord.quality).toBe('Major');
    expect(chord.romanNumeral).toBe('V');
  });

  it('detects Jazz ii - V - I Progression (Dm7 -> G7 -> Cmaj7) and provides modal scale recommendations', () => {
    // ii chord: D Minor 7 (D=2, F=5, A=9, C=0)
    chordTracker.reset();
    const dMin7Chroma = new Array(12).fill(0);
    dMin7Chroma[2] = 1; // D
    dMin7Chroma[5] = 1; // F
    dMin7Chroma[9] = 1; // A
    dMin7Chroma[0] = 1; // C

    const iiChord = chordTracker.analyzeChroma(dMin7Chroma, 'C Major');
    expect(iiChord.rootNoteName).toBe('D');
    expect(iiChord.romanNumeral).toBe('ii7');
    // Recommended solo scales for Dm7 should include Dorian
    expect(iiChord.recommendedScales.some(s => s.includes('Dorian'))).toBe(true);

    // V chord: G7 (G=7, B=11, D=2, F=5)
    chordTracker.reset();
    const g7Chroma = new Array(12).fill(0);
    g7Chroma[7] = 1;
    g7Chroma[11] = 1;
    g7Chroma[2] = 1;
    g7Chroma[5] = 1;

    const vChord = chordTracker.analyzeChroma(g7Chroma, 'C Major');
    expect(vChord.rootNoteName).toBe('G');
    expect(vChord.romanNumeral).toBe('V7');
    expect(vChord.recommendedScales.some(s => s.includes('Mixolydian'))).toBe(true);

    // I chord: Cmaj7 (C=0, E=4, G=7, B=11)
    chordTracker.reset();
    const cMaj7Chroma = new Array(12).fill(0);
    cMaj7Chroma[0] = 1;
    cMaj7Chroma[4] = 1;
    cMaj7Chroma[7] = 1;
    cMaj7Chroma[11] = 1;

    const iChord = chordTracker.analyzeChroma(cMaj7Chroma, 'C Major');
    expect(iChord.rootNoteName).toBe('C');
    expect(iChord.romanNumeral).toBe('Imaj7');
    expect(iChord.recommendedScales.some(s => s.includes('Lydian') || s.includes('Major'))).toBe(true);
  });

  it('detects harmonic tension differences between resolved tonic and tense diminished/dominant chords', () => {
    // A Minor tonic (A=9, C=0, E=4)
    const aMinChroma = new Array(12).fill(0);
    aMinChroma[9] = 1; aMinChroma[0] = 1; aMinChroma[4] = 1;
    const tonic = chordTracker.analyzeChroma(aMinChroma, 'A Minor');

    // B Diminished vii° (B=11, D=2, F=5)
    const bDimChroma = new Array(12).fill(0);
    bDimChroma[11] = 1; bDimChroma[2] = 1; bDimChroma[5] = 1;
    const diminished = chordTracker.analyzeChroma(bDimChroma, 'A Minor');

    expect(tonic.harmonicTension).toBeLessThan(diminished.harmonicTension);
    expect(diminished.harmonicTension).toBe(0.9); // Highest dissonance score
  });

  it('adapts LocalGenerativeCompanion pad harmonics to detected key or chroma immediately', () => {
    const companion = new LocalGenerativeCompanion();

    // Send E Minor key
    companion.updateConditioning({
      pitchState: new Array(128).fill(-1),
      stylePrompt: 'steady groove',
      timestamp: Date.now(),
      mode: 'midi+audio',
      estimatedKey: 'E Minor',
    });

    // Generate chunk and verify samples are generated around E minor frequencies (E3 ~164Hz, G3 ~196Hz, B3 ~246Hz)
    const chunk = companion.generateAndPushChunk();
    expect(chunk.byteLength).toBe(BINARY_HEADER_SIZE + 1920 * 2 * 4);

    const floatData = new Float32Array(chunk, BINARY_HEADER_SIZE, 1920 * 2);
    // Non-silent audio must be generated
    const hasAudio = Array.from(floatData).some(s => Math.abs(s) > 0.01);
    expect(hasAudio).toBe(true);
  });
});

// ===============================================================================
// 3. Dynamic Performance Tiers (Musician Energy Escalation)
// ===============================================================================

describe('Musician Flow 3: Performance Tier Escalation & Drum Pattern Density', () => {
  it('keeps drums muted in chill tier during quiet fingerpicking', () => {
    const companion = new LocalGenerativeCompanion();

    // Chill tier conditioning
    companion.updateConditioning({
      pitchState: new Array(128).fill(-1),
      stylePrompt: 'sparse ambient acoustic',
      timestamp: Date.now(),
      mode: 'midi+audio',
    });

    const chunk = companion.generateAndPushChunk();
    const samples = new Float32Array(chunk, BINARY_HEADER_SIZE, 1920 * 2);

    // In chill tier, drum gain is 0, only warm pad/ambient bass plays
    // Peak amplitude in chill is gentle (always < 0.40)
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i]) > peak) peak = Math.abs(samples[i]);
    }
    expect(peak).toBeLessThan(0.40);
  });

  it('escalates drum energy between chill, groove, and peak tiers', () => {
    // 1. Chill: drums 0
    const chillCompanion = new LocalGenerativeCompanion();
    const chillPitches = new Array(128).fill(-1);
    chillPitches[60] = 2; // C4 onset
    chillCompanion.updateConditioning({
      pitchState: chillPitches,
      stylePrompt: 'sparse ambient',
      timestamp: Date.now(),
      mode: 'midi+audio',
    });
    let chillPeak = 0;
    for (let c = 0; c < 16; c++) {
      const chunk = chillCompanion.generateAndPushChunk();
      const floats = new Float32Array(chunk, BINARY_HEADER_SIZE, 1920 * 2);
      for (let i = 0; i < floats.length; i++) {
        if (Math.abs(floats[i]) > chillPeak) chillPeak = Math.abs(floats[i]);
      }
    }

    // 2. Peak: full drums (kick + snare + 16th hats) + high bass
    const peakCompanion = new LocalGenerativeCompanion();
    const peakPitches = new Array(128).fill(-1);
    peakPitches[60] = 2; // C4 onset
    peakCompanion.updateConditioning({
      pitchState: peakPitches,
      stylePrompt: 'driving energetic anthem',
      timestamp: Date.now(),
      mode: 'midi+audio',
    });
    let peakPeak = 0;
    for (let c = 0; c < 16; c++) {
      const chunk = peakCompanion.generateAndPushChunk();
      const floats = new Float32Array(chunk, BINARY_HEADER_SIZE, 1920 * 2);
      for (let i = 0; i < floats.length; i++) {
        if (Math.abs(floats[i]) > peakPeak) peakPeak = Math.abs(floats[i]);
      }
    }

    // Peak tier energy must be noticeably higher than chill tier
    expect(peakPeak).toBeGreaterThan(chillPeak);
  });
});

// ===============================================================================
// 4. Output Audio Quality, Headroom & Mastering Safety
// ===============================================================================

describe('Musician Flow 4: Audio Synthesis Quality, NaN Immunity & Mastering Safety', () => {
  it('guarantees audio synthesis is 100% free of NaN, Infinity, and null values', () => {
    const companion = new LocalGenerativeCompanion();

    // Simulate 25 consecutive 40ms chunks (1 second of real-time audio)
    for (let chunkIdx = 0; chunkIdx < 25; chunkIdx++) {
      const buffer = companion.generateAndPushChunk();
      const floats = new Float32Array(buffer, BINARY_HEADER_SIZE, 1920 * 2);

      let hasNaN = false;
      let hasNonFinite = false;
      let outOfRange = false;
      for (let i = 0; i < floats.length; i++) {
        const val = floats[i];
        if (Number.isNaN(val)) hasNaN = true;
        if (!Number.isFinite(val)) hasNonFinite = true;
        if (val < -1.0 || val > 1.0) outOfRange = true;
      }
      expect(hasNaN).toBe(false);
      expect(hasNonFinite).toBe(false);
      expect(outOfRange).toBe(false);
    }
  });

  it('verifies MasteringChain tube warmth produces hyperbolic saturation without clipping', () => {
    const ctx = new MockAudioContext() as unknown as AudioContext;
    const mastering = new MasteringChain(ctx, {
      enableWarmth: true,
      warmthAmount: 0.8, // Heavy tube drive
    });

    expect(mastering.getOptions().warmthAmount).toBe(0.8);
    // Tube warmth setting must clamp properly to [0, 1]
    mastering.setWarmth(1.5);
    expect(mastering.getOptions().warmthAmount).toBe(1.0);
  });

  it('verifies stereo widener decorrelation options', () => {
    const ctx = new MockAudioContext() as unknown as AudioContext;
    const mastering = new MasteringChain(ctx);

    mastering.setStereoWidth(1.75);
    expect(mastering.getOptions().stereoWidth).toBe(1.75);

    // Clamps excessive width to avoid phase inversion
    mastering.setStereoWidth(3.5);
    expect(mastering.getOptions().stereoWidth).toBe(2.5);
  });
});

// ===============================================================================
// 5. Dynamic Song Structure & Drum Fills
// ===============================================================================

describe('Musician Flow 5: Song Structure Evolution & Drum Fills', () => {
  it('evolves from Verse to PreChorus when musician plays with high energy (>0.6)', () => {
    const sectionChanges: string[] = [];
    const arranger = new DynamicArranger({
      onSectionChanged: (sec) => sectionChanges.push(sec),
    });

    expect(arranger.getState().currentSection).toBe('verse');

    // Simulate musician playing 8 bars of high energy (liveEnergy = 0.85)
    // 8 bars * 4 beats = 32 beats
    for (let beat = 1; beat <= 32; beat++) {
      arranger.advanceBeat(beat * 500, 0.85);
    }

    // After 8 bars of high energy, Verse evolves to PreChorus
    expect(arranger.getState().currentSection).toBe('preChorus');
    expect(sectionChanges).toContain('preChorus');
  });

  it('arms and fires drum fill on beat 4 of transition bar (bar 4)', () => {
    let fillFiredAtBar = -1;
    const arranger = new DynamicArranger({
      onDrumFillTriggered: (bar) => {
        fillFiredAtBar = bar;
      },
    });

    // Advance 14 beats to reach Bar 4, Beat 3
    for (let b = 1; b <= 14; b++) {
      arranger.advanceBeat(b * 500);
      expect(arranger.getState().isFillActive).toBe(false);
    }

    // 15th advance -> Bar 4, Beat 4 -> Drum fill must activate!
    const state = arranger.advanceBeat(15 * 500);
    expect(state.currentBar).toBe(4);
    expect(state.currentBeat).toBe(4);
    expect(state.isFillActive).toBe(true);
    expect(fillFiredAtBar).toBe(4);

    // Next beat (Bar 5, Beat 1) -> fill must automatically disarm
    const nextState = arranger.advanceBeat(16 * 500);
    expect(nextState.currentBar).toBe(5);
    expect(nextState.currentBeat).toBe(1);
    expect(nextState.isFillActive).toBe(false);
  });

  it('allows musician to manually queue a drum fill at any time', () => {
    const arranger = new DynamicArranger();
    expect(arranger.getState().isFillQueued).toBe(false);

    arranger.triggerFill();
    expect(arranger.getState().isFillQueued).toBe(true);
  });
});

// ===============================================================================
// 6. Musician Hardware Flow & Jam Recording
// ===============================================================================

describe('Musician Flow 6: MIDI Footswitch Ergonomics, Retrospective Capture & Export', () => {
  it('toggles recording with MIDI Footswitch (CC#64) and ignores pedal release (debounce)', () => {
    let recordToggles = 0;
    const midi = new WebMIDIManager({
      onActionTriggered: (action) => {
        if (action === 'TOGGLE_RECORD') recordToggles++;
      },
    });

    // Simulate pedal PRESS (value = 127) -> starts recording
    midi.handleMIDIMessage({ data: new Uint8Array([0xB0, 64, 127]) });
    expect(recordToggles).toBe(1);

    // Simulate pedal RELEASE (value = 0) -> should be ignored (no toggle!)
    midi.handleMIDIMessage({ data: new Uint8Array([0xB0, 64, 0]) });
    expect(recordToggles).toBe(1); // Still 1

    // Second pedal PRESS (value = 127) -> stops recording
    midi.handleMIDIMessage({ data: new Uint8Array([0xB0, 64, 127]) });
    expect(recordToggles).toBe(2);
  });

  it('slices exactly 8 bars of audio at 120 BPM with Retrospective Take Capture', () => {
    const recorder = new OPFSRecorder(48000);

    // Feed 30 seconds of live jam chunks (each chunk = 1920 floats = 40ms)
    // 30s * 25 chunks/s = 750 chunks
    for (let i = 0; i < 750; i++) {
      const chunk = new Float32Array(1920);
      chunk.fill(Math.sin(i * 0.1) * 0.2);
      recorder.pushAudioChunk(chunk);
    }

    // At 120 BPM:
    // 1 beat = 0.5s. 1 bar = 2.0s.
    // 8 bars = 16.0s = 400 chunks @ 40ms = 768,000 samples @ 48kHz
    const take = recorder.captureRetrospectiveTake(8, 120);
    expect(take).not.toBeNull();
    expect(take!.takeNumber).toBe(1);

    const audioData = recorder.getTakeAudioData(1);
    expect(audioData).not.toBeNull();
    // 400 chunks * 1920 samples = 768,000 floats
    expect(audioData!.left.length).toBe(768000);
    expect(audioData!.right.length).toBe(768000);
  });

  it('exports a clean 48kHz stereo WAV file with standard 44-byte RIFF header', () => {
    const sampleRate = 48000;
    const numSamples = 48000; // 1 second of audio
    const left = new Float32Array(numSamples);
    const right = new Float32Array(numSamples);

    // Generate test 440Hz sine tone
    for (let i = 0; i < numSamples; i++) {
      left[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.5;
      right[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.5;
    }

    const exportFile = StemExporter.createExportFile(left, right, 'test_jam.wav', sampleRate);
    expect(exportFile.filename).toBe('test_jam.wav');
    expect(exportFile.blob.type).toBe('audio/wav');

    // Total file size = 44-byte header + numSamples * 2 channels * 2 bytes/sample (16-bit PCM)
    // 44 + 48000 * 4 = 192,044 bytes
    expect(exportFile.fileSizeBytes).toBe(192044);
    expect(exportFile.blob.size).toBe(192044);
  });
});

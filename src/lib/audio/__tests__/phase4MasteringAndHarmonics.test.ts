/**
 * Phase 4 Unit & Integration Tests: Mastering, Harmonic Intelligence & Dynamic Arranger
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChordProgressionTracker } from '../ChordProgressionTracker';
import { DynamicArranger } from '../DynamicArranger';
import { OPFSRecorder } from '../OPFSRecorder';

describe('Phase 4: Harmonic Chord Progression Tracker', () => {
  let tracker: ChordProgressionTracker;

  beforeEach(() => {
    tracker = new ChordProgressionTracker();
  });

  it('should accurately detect A Minor chord from chroma energy', () => {
    // A Minor: A (bin 9), C (bin 0), E (bin 4)
    const chroma = new Float32Array(12);
    chroma[9] = 1.0; // A
    chroma[0] = 0.9; // C
    chroma[4] = 0.85; // E

    const estimate = tracker.analyzeChroma(chroma, 'A Minor');
    expect(estimate.rootNoteName).toBe('A');
    expect(estimate.quality).toBe('Minor');
    expect(estimate.chordSymbol).toBe('Am');
    expect(estimate.romanNumeral).toBe('i');
    expect(estimate.confidence).toBeGreaterThan(0.3);
    expect(estimate.recommendedScales.length).toBeGreaterThan(0);
    expect(estimate.recommendedScales[0]).toContain('A Dorian');
  });

  it('should accurately detect G Dominant 7th chord in C Major', () => {
    // G7: G (bin 7), B (bin 11), D (bin 2), F (bin 5)
    const chroma = new Float32Array(12);
    chroma[7] = 1.0; // G
    chroma[11] = 0.9; // B
    chroma[2] = 0.85; // D
    chroma[5] = 0.8; // F

    const estimate = tracker.analyzeChroma(chroma, 'C Major');
    expect(estimate.rootNoteName).toBe('G');
    expect(estimate.quality).toBe('7th');
    expect(estimate.chordSymbol).toBe('G7');
    expect(estimate.romanNumeral).toBe('V7');
    expect(estimate.harmonicTension).toBeGreaterThan(0.5);
  });

  it('should recommend Lydian and Major Pentatonic for Cmaj7', () => {
    // Cmaj7: C (bin 0), E (bin 4), G (bin 7), B (bin 11)
    const chroma = new Float32Array(12);
    chroma[0] = 1.0;
    chroma[4] = 0.9;
    chroma[7] = 0.85;
    chroma[11] = 0.8;

    const estimate = tracker.analyzeChroma(chroma, 'C Major');
    expect(estimate.rootNoteName).toBe('C');
    expect(estimate.quality).toBe('Maj7');
    expect(estimate.recommendedScales.some((s) => s.includes('Lydian'))).toBe(true);
  });
});

describe('Phase 4: Dynamic Song Arranger', () => {
  let arranger: DynamicArranger;

  beforeEach(() => {
    arranger = new DynamicArranger();
  });

  it('should advance beats and bars in 4/4 meter', () => {
    expect(arranger.getState().currentBar).toBe(1);
    expect(arranger.getState().currentBeat).toBe(1);

    // Advance 4 beats (one full bar)
    arranger.advanceBeat(100);
    arranger.advanceBeat(200);
    arranger.advanceBeat(300);
    const state = arranger.advanceBeat(400);

    expect(state.currentBar).toBe(2);
    expect(state.currentBeat).toBe(1);
  });

  it('should trigger drum fills at bar 4 transitions or on queue', () => {
    arranger.triggerFill();
    expect(arranger.getState().isFillQueued).toBe(true);

    // Advance to beat 4
    arranger.advanceBeat(100);
    arranger.advanceBeat(200);
    const s = arranger.advanceBeat(300);

    expect(s.isFillActive).toBe(true);
  });

  it('should transition sections when section length is reached', () => {
    arranger.setSection('intro');
    expect(arranger.getState().currentSection).toBe('intro');

    // Advance 32 beats (8 bars)
    for (let i = 0; i < 32; i++) {
      arranger.advanceBeat(i * 100);
    }

    expect(arranger.getState().currentSection).toBe('verse');
  });
});

describe('Phase 4: Retrospective Loop Capture (OPFSRecorder)', () => {
  let recorder: OPFSRecorder;

  beforeEach(() => {
    recorder = new OPFSRecorder(48000);
  });

  it('should capture last 8 bars without needing prior recording armed', () => {
    const chunkLen = 1920; // 40ms at 48kHz
    const left = new Float32Array(chunkLen).fill(0.2);
    const right = new Float32Array(chunkLen).fill(0.2);

    // Push 400 chunks (~16 seconds of audio) into the circular rolling buffer
    for (let i = 0; i < 400; i++) {
      recorder.pushAudioChunk(left, right);
    }

    // Capture last 8 bars at 120 BPM (16 seconds)
    const retroTake = recorder.captureRetrospectiveTake(8, 120);
    expect(retroTake).not.toBeNull();
    expect(retroTake?.takeNumber).toBe(1);
    expect(retroTake?.durationMs).toBe(16000);

    const takeData = recorder.getTakeAudioData(1);
    expect(takeData).not.toBeNull();
    expect(takeData?.left.length).toBeGreaterThan(0);
  });
});

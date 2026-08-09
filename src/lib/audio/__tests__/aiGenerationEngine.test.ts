import { describe, it, expect, vi } from 'vitest';
import { AIGenerationEngine } from '../AIGenerationEngine';
import {
  snapPitchToScale,
  createDrumPrimerFromRhythm,
  createInitialDrumSeedSeq,
  deriveBasslineSequence,
  getTemperatureForTier,
  generateBarWithModels,
} from '../magentaLogic';
import { MIDINoteEvent, NoteSequencePayload } from '../types';

describe('AI MIDI Generation Logic Regression Suite', () => {
  // 1. Primer routing isolation
  describe('1. Primer Routing Isolation', () => {
    it('should continue melody and use its result when drumsModel.continueSequence throws', async () => {
      const melodyResult: NoteSequencePayload = {
        notes: [{ pitch: 65, startTime: 0, duration: 0.5, velocity: 0.8 }],
        totalTime: 2.0,
        qpm: 120,
      };

      const failingDrumsModel = {
        continueSequence: vi.fn().mockRejectedValue(new Error('Drums RNN network error')),
      };

      const workingMelodyModel = {
        continueSequence: vi.fn().mockResolvedValue(melodyResult),
      };

      const primedSequence: NoteSequencePayload = {
        notes: [{ pitch: 60, startTime: 0, duration: 0.5, velocity: 0.8 }],
        totalTime: 2.0,
        qpm: 120,
      };

      const res = await generateBarWithModels(
        { primedSequence, barIndex: 1, activeTier: 'groove' },
        { drumsModel: failingDrumsModel, melodyModel: workingMelodyModel }
      );

      expect(workingMelodyModel.continueSequence).toHaveBeenCalled();
      expect(res.melodySequence).not.toBeNull();
      expect(res.melodySequence?.notes[0].pitch).toBe(65);
      expect(res.drumsSequence).not.toBeNull();
      expect(res.drumsSequence?.notes.length).toBeGreaterThan(0);
    });

    it('should continue drums and use its result when melodyModel.continueSequence throws', async () => {
      const drumsResult: NoteSequencePayload = {
        notes: [
          { pitch: 36, startTime: 0, duration: 0.25, velocity: 0.9 },
          { pitch: 38, startTime: 1.0, duration: 0.25, velocity: 0.8 },
        ],
        totalTime: 2.0,
        qpm: 120,
      };

      const workingDrumsModel = {
        continueSequence: vi.fn().mockResolvedValue(drumsResult),
      };

      const failingMelodyModel = {
        continueSequence: vi.fn().mockRejectedValue(new Error('Melody RNN network error')),
      };

      const primedSequence: NoteSequencePayload = {
        notes: [{ pitch: 60, startTime: 0, duration: 0.5, velocity: 0.8 }],
        totalTime: 2.0,
        qpm: 120,
      };

      const res = await generateBarWithModels(
        { primedSequence, barIndex: 1, activeTier: 'groove' },
        { drumsModel: workingDrumsModel, melodyModel: failingMelodyModel }
      );

      expect(workingDrumsModel.continueSequence).toHaveBeenCalled();
      expect(res.drumsSequence).toEqual(drumsResult);
      expect(res.melodySequence).not.toBeNull();
      expect(res.melodySequence?.notes.length).toBeGreaterThan(0);
    });
  });

  // 2. Drum vocabulary safety
  describe('2. Drum Vocabulary Safety', () => {
    it('should map live melody notes exclusively to valid drum pitches (36, 38, 42) and never leak raw melody pitches', () => {
      const syntheticMelodySeq: NoteSequencePayload = {
        notes: [
          { pitch: 60, startTime: 0.0, duration: 0.2, velocity: 0.7 }, // step 0 -> Kick 36
          { pitch: 64, startTime: 0.25, duration: 0.2, velocity: 0.7 }, // step 2 -> HiHat 42
          { pitch: 67, startTime: 0.5, duration: 0.2, velocity: 0.9 }, // step 4 -> Snare 38
          { pitch: 72, startTime: 0.75, duration: 0.2, velocity: 0.7 }, // step 6 -> HiHat 42
          { pitch: 76, startTime: 1.0, duration: 0.2, velocity: 0.7 }, // step 8 -> Kick 36
          { pitch: 79, startTime: 1.25, duration: 0.2, velocity: 0.9 }, // step 10 -> Snare 38 (accent)
          { pitch: 84, startTime: 1.5, duration: 0.2, velocity: 0.7 }, // step 12 -> Snare 38
        ],
        totalTime: 2.0,
        qpm: 120,
      };

      const drumPrimer = createDrumPrimerFromRhythm(syntheticMelodySeq, 'groove');
      const validDrumPitches = new Set([36, 38, 42]);

      expect(drumPrimer.notes.length).toBeGreaterThan(0);

      for (const note of drumPrimer.notes) {
        expect(validDrumPitches.has(note.pitch)).toBe(true);
        expect([60, 64, 67, 72, 76, 79, 84]).not.toContain(note.pitch);
      }
    });
  });

  // 3. Silent fallback correctness
  describe('3. Silent Fallback Correctness', () => {
    it('should fall back to silent drum seed pattern when primedSequence is empty or null without throwing', () => {
      expect(() => createDrumPrimerFromRhythm({ notes: [], totalTime: 2.0, qpm: 120 }, 'groove')).not.toThrow();
      expect(() => createDrumPrimerFromRhythm(null, 'chill')).not.toThrow();

      const emptyResult = createDrumPrimerFromRhythm({ notes: [], totalTime: 2.0, qpm: 120 }, 'groove');
      const seedResult = createInitialDrumSeedSeq('groove');

      expect(emptyResult.notes).toEqual(seedResult.notes);
      expect(emptyResult.notes.length).toBeGreaterThan(0);
      for (const note of emptyResult.notes) {
        expect([36, 38, 42]).toContain(note.pitch);
      }
    });
  });

  // 4. Different input produces different output
  describe('4. Different Input Produces Different Output', () => {
    it('should generate distinct primers when fed distinct synthetic note sequences', () => {
      const mockCtx = {} as AudioContext;
      const mockSynth = {} as any;
      const engine = new AIGenerationEngine(mockCtx, mockSynth);

      const seqA: MIDINoteEvent[] = [
        { pitch: 60, velocity: 0.8, startTime: 0.0, duration: 0.5 },
        { pitch: 62, velocity: 0.8, startTime: 0.5, duration: 0.5 },
      ];

      const seqB: MIDINoteEvent[] = [
        { pitch: 77, velocity: 0.9, startTime: 1.0, duration: 0.25 },
        { pitch: 81, velocity: 0.9, startTime: 1.25, duration: 0.25 },
        { pitch: 84, velocity: 0.9, startTime: 1.5, duration: 0.25 },
      ];

      engine.updateBufferedNotes(seqA);
      const primerA = engine.getPrimedSequenceForBar(1);

      engine.updateBufferedNotes(seqB);
      const primerB = engine.getPrimedSequenceForBar(1);

      expect(primerA).not.toEqual(primerB);
      expect(primerA.notes).not.toEqual(primerB.notes);
      expect(primerA.notes.map((n) => n.pitch)).not.toEqual(primerB.notes.map((n) => n.pitch));
    });
  });

  // 5. Key/scale snapping
  describe('5. Key/Scale Snapping', () => {
    it('should pass in-scale C Major pitches through unchanged', () => {
      const inScalePitches = [60, 62, 64, 65, 67, 69, 71]; // C4, D4, E4, F4, G4, A4, B4
      for (const pitch of inScalePitches) {
        expect(snapPitchToScale(pitch)).toBe(pitch);
      }
    });

    it('should snap out-of-scale pitches to the nearest C Major in-scale pitch', () => {
      expect([60, 62]).toContain(snapPitchToScale(61));
      expect([65, 67]).toContain(snapPitchToScale(66));
      expect([62, 64]).toContain(snapPitchToScale(63));
      expect([67, 69]).toContain(snapPitchToScale(68));
    });

    it('should exclude drum pitches (36, 38, 42) from scale snapping entirely', () => {
      expect(snapPitchToScale(36)).toBe(36); // Kick
      expect(snapPitchToScale(38)).toBe(38); // Snare
      expect(snapPitchToScale(42)).toBe(42); // Closed Hi-Hat
    });
  });

  // 6. Tier → temperature mapping
  describe('6. Tier → Temperature Mapping', () => {
    it('should map chill to ~0.7, groove to ~1.0, peak to ~1.2', () => {
      expect(getTemperatureForTier('chill')).toBeCloseTo(0.7);
      expect(getTemperatureForTier('groove')).toBeCloseTo(1.0);
      expect(getTemperatureForTier('peak')).toBeCloseTo(1.2);
    });

    it('should fall back to sane default (1.0) when given invalid/unknown tier value', () => {
      expect(getTemperatureForTier('invalid_tier')).toBe(1.0);
      expect(getTemperatureForTier('')).toBe(1.0);
      expect(getTemperatureForTier(undefined as any)).toBe(1.0);
    });
  });

  // 7. Bass root-locking
  describe('7. Bass Root-Locking', () => {
    it('should always output MIDI 36 at step 0 and MIDI 43 at step 8, while mirroring melody contour off-downbeat', () => {
      const syntheticMelody: NoteSequencePayload = {
        notes: [
          { pitch: 72, velocity: 0.8, startTime: 0.0, duration: 0.25, quantizedStartStep: 0 }, // Step 0: downbeat -> Root MIDI 36
          { pitch: 76, velocity: 0.8, startTime: 0.5, duration: 0.25, quantizedStartStep: 4 }, // Step 4: off-downbeat high note
          { pitch: 79, velocity: 0.8, startTime: 1.0, duration: 0.25, quantizedStartStep: 8 }, // Step 8: downbeat -> Fifth MIDI 43
          { pitch: 67, velocity: 0.8, startTime: 1.5, duration: 0.25, quantizedStartStep: 12 }, // Step 12: off-downbeat lower note
        ],
        totalTime: 2.0,
        qpm: 120,
      };

      const bassSeq = deriveBasslineSequence(syntheticMelody, 0);
      expect(bassSeq.notes.length).toBe(4);

      const step0Note = bassSeq.notes.find((n) => n.quantizedStartStep === 0);
      expect(step0Note?.pitch).toBe(36); // Root C2

      const step8Note = bassSeq.notes.find((n) => n.quantizedStartStep === 8);
      expect(step8Note?.pitch).toBe(43); // Fifth G2

      const step4Bass = bassSeq.notes.find((n) => n.quantizedStartStep === 4);
      const step12Bass = bassSeq.notes.find((n) => n.quantizedStartStep === 12);

      expect(step4Bass?.pitch).toBeGreaterThan(step12Bass!.pitch);
      expect(step4Bass?.pitch).toBeGreaterThanOrEqual(28);
      expect(step4Bass?.pitch).toBeLessThanOrEqual(52);
      expect(step12Bass?.pitch).toBeGreaterThanOrEqual(28);
      expect(step12Bass?.pitch).toBeLessThanOrEqual(52);
    });
  });
});

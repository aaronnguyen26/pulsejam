import { describe, it, expect, vi } from 'vitest';
import { TempoTracker } from '../TempoTracker';
import { ChromaFeatureExtractor } from '../ChromaFeatureExtractor';
import {
  getStylePreset,
  getAllStylePresets,
  getTierPromptForPreset,
} from '../StylePresets';

describe('Phase 2: Musical Magic & Flow State Intelligence', () => {
  describe('1. Acoustic Count-In & Tempo Tracking Engine', () => {
    it('initializes with default 120 BPM and idle state', () => {
      const tracker = new TempoTracker();
      expect(tracker.getBpm()).toBe(120);
      expect(tracker.getCountInState()).toBe('idle');
    });

    it('arms count-in and successfully locks tempo on 4 steady acoustic beats', () => {
      const onBeatSpy = vi.fn();
      const onCompleteSpy = vi.fn();

      const tracker = new TempoTracker({
        onCountInBeat: onBeatSpy,
        onCountInComplete: onCompleteSpy,
      });

      tracker.armCountIn();
      expect(tracker.getCountInState()).toBe('listening');

      // Simulate 4 steady guitar strums / drum clicks at 100 BPM (600ms interval)
      const baseTime = 10000;
      tracker.registerOnset(baseTime);        // Beat 1
      tracker.registerOnset(baseTime + 600);  // Beat 2
      tracker.registerOnset(baseTime + 1200); // Beat 3
      tracker.registerOnset(baseTime + 1800); // Beat 4

      expect(onBeatSpy).toHaveBeenCalledTimes(4);
      expect(onBeatSpy).toHaveBeenNthCalledWith(1, 1, expect.any(Number));
      expect(onBeatSpy).toHaveBeenNthCalledWith(2, 2, 100);
      expect(onBeatSpy).toHaveBeenNthCalledWith(3, 3, 100);
      expect(onBeatSpy).toHaveBeenNthCalledWith(4, 4, 100);

      expect(onCompleteSpy).toHaveBeenCalledWith(100);
      expect(tracker.getCountInState()).toBe('locked');
      expect(tracker.getBpm()).toBe(100);
    });

    it('resets count-in when taps are excessively erratic or spaced too far apart', () => {
      const onCompleteSpy = vi.fn();
      const tracker = new TempoTracker({ onCountInComplete: onCompleteSpy });

      tracker.armCountIn();
      const base = 20000;
      tracker.registerOnset(base);
      tracker.registerOnset(base + 300);   // 200 BPM
      tracker.registerOnset(base + 1500);  // 50 BPM (erratic!)

      expect(tracker.getCountInState()).toBe('counting');
      expect(onCompleteSpy).not.toHaveBeenCalled();
    });
  });

  describe('2. Chroma Feature Extraction & Harmonic Key Center Profiler', () => {
    it('correctly calculates 12-bin Pitch Class Profile for C Major triad', () => {
      const chroma = new ChromaFeatureExtractor();

      // Feed C Major notes: C4 (60), E4 (64), G4 (67)
      chroma.addPitch(60, 1.0); // C
      chroma.addPitch(64, 1.0); // E
      chroma.addPitch(67, 1.0); // G

      const vector = chroma.getNormalizedChroma();
      expect(vector.length).toBe(12);

      // C=0, E=4, G=7 should have substantial energy
      expect(vector[0]).toBeGreaterThan(0.1);
      expect(vector[4]).toBeGreaterThan(0.1);
      expect(vector[7]).toBeGreaterThan(0.1);

      const estimate = chroma.estimateKey();
      expect(estimate.root).toBe('C');
      expect(estimate.mode).toBe('Major');
      expect(estimate.key).toBe('C Major');
      expect(estimate.confidence).toBeGreaterThan(0.5);
    });

    it('correctly estimates A Minor tonality when fed A minor harmony', () => {
      const chroma = new ChromaFeatureExtractor();

      // Feed A Minor notes: A3 (57), C4 (60), E4 (64)
      for (let i = 0; i < 3; i++) {
        chroma.addPitch(57, 1.0); // A
        chroma.addPitch(60, 0.9); // C
        chroma.addPitch(64, 0.9); // E
      }

      const estimate = chroma.estimateKey();
      expect(estimate.root).toBe('A');
      expect(estimate.mode).toBe('Minor');
      expect(estimate.key).toBe('A Minor');
    });
  });

  describe('3. Curated Style Presets Catalogue', () => {
    it('contains all 6 signature genre presets with complete tier prompts', () => {
      const presets = getAllStylePresets();
      expect(presets.length).toBe(6);

      const ids = presets.map((p) => p.id);
      expect(ids).toContain('lo-fi');
      expect(ids).toContain('neo-soul');
      expect(ids).toContain('indie-rock');
      expect(ids).toContain('synthwave');
      expect(ids).toContain('cinematic-ambient');
      expect(ids).toContain('funk-pocket');

      presets.forEach((preset) => {
        expect(preset.tierPrompts.chill.length).toBeGreaterThan(10);
        expect(preset.tierPrompts.groove.length).toBeGreaterThan(10);
        expect(preset.tierPrompts.peak.length).toBeGreaterThan(10);
        expect(preset.defaultBpm).toBeGreaterThan(50);
        expect(preset.colorAccent).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('retrieves preset details and tier prompts dynamically', () => {
      const neoSoul = getStylePreset('neo-soul');
      expect(neoSoul.name).toBe('Neo-Soul Warmth');
      expect(neoSoul.category).toBe('Soul');

      const peakPrompt = getTierPromptForPreset('neo-soul', 'peak');
      expect(peakPrompt).toContain('neo-soul funk');

      // Fallback for unknown preset id
      const fallback = getStylePreset('unknown-id-xyz');
      expect(fallback.id).toBe('lo-fi');
    });
  });
});

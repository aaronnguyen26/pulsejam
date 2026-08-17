/**
 * PulseJam Stage 2 — Chroma Feature Extractor & Key Center Estimator
 *
 * Implements:
 * 1. 12-dimensional Pitch Class Profile (Chroma vector: C, C#, D, D#, E, F, F#, G, G#, A, A#, B).
 * 2. Harmonic Energy Accumulation with exponential memory decay.
 * 3. Krumhansl-Schmuckler Key-Finding Algorithm to estimate musical key center and tonality.
 */

export const PITCH_CLASS_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

// Krumhansl-Kessler Key Profiles
// Major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
// Minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

export interface KeyEstimateResult {
  key: string;
  root: string;
  mode: 'Major' | 'Minor';
  confidence: number;
  chromaVector: number[];
}

export class ChromaFeatureExtractor {
  private chroma: Float32Array = new Float32Array(12);
  private decayFactor: number;

  constructor(decayFactor = 0.92) {
    this.decayFactor = decayFactor;
  }

  /**
   * Resets internal chroma accumulation.
   */
  public reset(): void {
    this.chroma.fill(0);
  }

  /**
   * Ingests a detected MIDI pitch (0..127) and adds energy with velocity weight.
   */
  public addPitch(midiPitch: number, velocity = 1.0): void {
    if (midiPitch < 0 || midiPitch > 127) return;

    // Apply temporal decay to existing chroma vector
    for (let i = 0; i < 12; i++) {
      this.chroma[i] *= this.decayFactor;
    }

    const pitchClass = midiPitch % 12;
    this.chroma[pitchClass] += Math.max(0.1, velocity);
  }

  /**
   * Returns normalized 12-element chroma array (sum = 1.0 or 0).
   */
  public getNormalizedChroma(): number[] {
    const sum = this.chroma.reduce((a, b) => a + b, 0);
    if (sum < 0.001) {
      return new Array(12).fill(0);
    }
    return Array.from(this.chroma).map((val) => val / sum);
  }

  /**
   * Estimates key center and mode using Krumhansl-Schmuckler algorithm.
   */
  public estimateKey(): KeyEstimateResult {
    const normalized = this.getNormalizedChroma();
    const sum = normalized.reduce((a, b) => a + b, 0);

    if (sum < 0.01) {
      return {
        key: 'A Minor', // Default ambient/rock studio root
        root: 'A',
        mode: 'Minor',
        confidence: 0,
        chromaVector: normalized,
      };
    }

    let bestScore = -Infinity;
    let bestRoot = 0;
    let bestMode: 'Major' | 'Minor' = 'Major';

    for (let root = 0; root < 12; root++) {
      // 1. Correlate against shifted Major Profile
      const majScore = this.computeCorrelation(normalized, MAJOR_PROFILE, root);
      if (majScore > bestScore) {
        bestScore = majScore;
        bestRoot = root;
        bestMode = 'Major';
      }

      // 2. Correlate against shifted Minor Profile
      const minScore = this.computeCorrelation(normalized, MINOR_PROFILE, root);
      if (minScore > bestScore) {
        bestScore = minScore;
        bestRoot = root;
        bestMode = 'Minor';
      }
    }

    const rootName = PITCH_CLASS_NAMES[bestRoot];
    const keyName = `${rootName} ${bestMode}`;
    const confidence = Math.max(0, Math.min(1, (bestScore + 1) / 2));

    return {
      key: keyName,
      root: rootName,
      mode: bestMode,
      confidence,
      chromaVector: normalized,
    };
  }

  private computeCorrelation(chroma: number[], profile: number[], shift: number): number {
    const n = 12;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const x = chroma[i];
      const y = profile[(i - shift + n) % n];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
  }
}

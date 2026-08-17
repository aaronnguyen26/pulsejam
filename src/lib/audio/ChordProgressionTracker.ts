/**
 * ChordProgressionTracker.ts - Real-Time Polyphonic Harmony & Chord Progression Analyzer
 *
 * Analyzes chromagram energy distribution and detected pitch history to deduce:
 * 1. Root note and chord quality (Major, Minor, 7th, Maj7, Min7, Dim, Sus4, Dom7).
 * 2. Harmonic function & Roman Numeral notation (I, ii, iii, IV, V, vi, vii°).
 * 3. Scale & Mode Solo Recommendations (e.g., E Dorian, A Minor Pentatonic, C Lydian).
 * 4. Harmonic Tension / Stability score (0.0 = resolved tonic, 1.0 = dominant/leading dissonance).
 */

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
  rootNoteName: string; // e.g. "C", "G#", "A"
  rootMidiPitch: number; // 0-11 (C=0)
  quality: ChordQuality;
  chordSymbol: string; // e.g. "Cmaj7", "Am7", "G7"
  confidence: number; // 0.0 - 1.0
  romanNumeral: string; // e.g. "I", "vi", "V7", "ii"
  recommendedScales: string[]; // e.g. ["A Dorian", "A Minor Pentatonic", "A Blues"]
  harmonicTension: number; // 0.0 (resolved) - 1.0 (tense)
}

export interface ScaleRecommendation {
  scaleName: string;
  notes: string[];
  description: string;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Chord interval templates (12-element binary masks for semitone intervals from root)
const CHORD_TEMPLATES: Array<{ quality: ChordQuality; suffix: string; intervals: number[]; tension: number }> = [
  { quality: 'Major', suffix: '', intervals: [0, 4, 7], tension: 0.1 },
  { quality: 'Minor', suffix: 'm', intervals: [0, 3, 7], tension: 0.2 },
  { quality: 'Maj7', suffix: 'maj7', intervals: [0, 4, 7, 11], tension: 0.35 },
  { quality: 'Min7', suffix: 'm7', intervals: [0, 3, 7, 10], tension: 0.3 },
  { quality: '7th', suffix: '7', intervals: [0, 4, 7, 10], tension: 0.75 },
  { quality: 'Sus4', suffix: 'sus4', intervals: [0, 5, 7], tension: 0.5 },
  { quality: 'Dim', suffix: 'dim', intervals: [0, 3, 6], tension: 0.9 },
];

export class ChordProgressionTracker {
  private lastDetectedChord: ChordEstimate | null = null;
  private chordHistory: ChordEstimate[] = [];
  private smoothingBuffer: Float32Array = new Float32Array(12);

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.lastDetectedChord = null;
    this.chordHistory = [];
    this.smoothingBuffer.fill(0);
  }

  /**
   * Estimates the current chord and harmonic context given a 12-bin chromagram and estimated key center.
   * @param rawChroma 12-element Float32Array representing pitch classes C through B
   * @param currentKeyCenter e.g. "A Minor" or "C Major"
   */
  public analyzeChroma(
    rawChroma: Float32Array | number[],
    currentKeyCenter: string = 'C Major'
  ): ChordEstimate {
    // 1. Exponential moving average smoothing over chromagram energy (alpha = 0.4)
    for (let i = 0; i < 12; i++) {
      this.smoothingBuffer[i] = this.smoothingBuffer[i] * 0.6 + (rawChroma[i] || 0) * 0.4;
    }

    // Normalize smoothed chroma
    let maxVal = 0;
    for (let i = 0; i < 12; i++) {
      if (this.smoothingBuffer[i] > maxVal) maxVal = this.smoothingBuffer[i];
    }

    const normChroma = new Float32Array(12);
    if (maxVal > 0.001) {
      for (let i = 0; i < 12; i++) normChroma[i] = this.smoothingBuffer[i] / maxVal;
    }

    // 2. Score all 12 root candidates x chord templates
    let bestScore = -1;
    let bestRoot = 0;
    let bestTemplate = CHORD_TEMPLATES[0];

    for (let root = 0; root < 12; root++) {
      for (const tmpl of CHORD_TEMPLATES) {
        let matchEnergy = 0;
        let penaltyEnergy = 0;

        // Create 12-bin template mask
        const mask = new Array(12).fill(0);
        for (const interval of tmpl.intervals) {
          const bin = (root + interval) % 12;
          mask[bin] = 1;
        }

        for (let i = 0; i < 12; i++) {
          if (mask[i] === 1) {
            matchEnergy += normChroma[i];
          } else {
            penaltyEnergy += normChroma[i] * 0.35;
          }
        }

        const score = (matchEnergy / tmpl.intervals.length) - (penaltyEnergy / (12 - tmpl.intervals.length));
        if (score > bestScore) {
          bestScore = score;
          bestRoot = root;
          bestTemplate = tmpl;
        }
      }
    }

    const rootName = NOTE_NAMES[bestRoot];
    const chordSymbol = `${rootName}${bestTemplate.suffix}`;
    const confidence = Math.max(0, Math.min(1, bestScore));

    // 3. Compute Roman Numeral relative to key center
    const romanNumeral = this.calculateRomanNumeral(bestRoot, bestTemplate.quality, currentKeyCenter);

    // 4. Derive modal scale solo recommendations
    const recommendedScales = this.getRecommendedScales(bestRoot, bestTemplate.quality, currentKeyCenter);

    const estimate: ChordEstimate = {
      rootNoteName: rootName,
      rootMidiPitch: bestRoot,
      quality: bestTemplate.quality,
      chordSymbol: confidence > 0.25 ? chordSymbol : '...',
      confidence,
      romanNumeral: confidence > 0.25 ? romanNumeral : '—',
      recommendedScales,
      harmonicTension: bestTemplate.tension,
    };

    if (confidence > 0.3) {
      this.lastDetectedChord = estimate;
      this.chordHistory.push(estimate);
      if (this.chordHistory.length > 32) this.chordHistory.shift();
    }

    return estimate;
  }

  /**
   * Computes Roman Numeral degree representation (e.g. I, ii, IV, V7, vi)
   */
  private calculateRomanNumeral(chordRoot: number, quality: ChordQuality, keyCenter: string): string {
    const parts = keyCenter.split(' ');
    const tonicName = parts[0] || 'C';
    const isMinorKey = (parts[1] || 'Major').toLowerCase().includes('minor');

    const tonicIndex = NOTE_NAMES.indexOf(tonicName);
    if (tonicIndex === -1) return 'I';

    const interval = (chordRoot - tonicIndex + 12) % 12;

    const majorDegrees: Record<number, string> = {
      0: 'I',
      2: 'ii',
      4: 'iii',
      5: 'IV',
      7: 'V',
      9: 'vi',
      11: 'vii°',
    };

    const minorDegrees: Record<number, string> = {
      0: 'i',
      2: 'ii°',
      3: 'III',
      5: 'iv',
      7: 'v',
      8: 'VI',
      10: 'VII',
    };

    const baseDegree = isMinorKey ? (minorDegrees[interval] || 'bII') : (majorDegrees[interval] || 'bII');

    if (quality === '7th') return `${baseDegree}7`;
    if (quality === 'Maj7') return `${baseDegree}maj7`;
    if (quality === 'Min7') return `${baseDegree}7`;
    return baseDegree;
  }

  /**
   * Generates tailored modal & pentatonic solo scale recommendations
   */
  private getRecommendedScales(root: number, quality: ChordQuality, _keyCenter: string): string[] {
    const rootName = NOTE_NAMES[root];
    if (quality === 'Minor' || quality === 'Min7') {
      return [
        `${rootName} Dorian (Jazzy / Groovy)`,
        `${rootName} Minor Pentatonic (Rock / Blues)`,
        `${rootName} Natural Minor (Aeolian)`,
      ];
    }
    if (quality === '7th') {
      return [
        `${rootName} Mixolydian (Funk / Blues)`,
        `${rootName} Dominant Pentatonic`,
        `${rootName} Blues Scale`,
      ];
    }
    if (quality === 'Maj7') {
      return [
        `${rootName} Lydian (Dreamy / Modern)`,
        `${rootName} Major (Ionian)`,
        `${rootName} Major Pentatonic`,
      ];
    }
    return [
      `${rootName} Major Pentatonic`,
      `${rootName} Ionian (Standard Major)`,
      `${rootName} Lydian`,
    ];
  }

  public getLastDetectedChord(): ChordEstimate | null {
    return this.lastDetectedChord;
  }

  public getRecentChords(): ChordEstimate[] {
    return [...this.chordHistory];
  }
}

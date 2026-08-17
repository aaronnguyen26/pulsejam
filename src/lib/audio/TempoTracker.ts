/**
 * PulseJam Stage 2/3 — TempoTracker & Acoustic Count-In Engine
 *
 * Provides real-time acoustic tempo tracking (BPM estimation) and hands-free 4-beat Count-In.
 * Listens for rhythmic acoustic instrument transients, taps, or pick attacks to:
 * 1. Autocorrelate Inter-Onset Intervals (IOI) to calculate tempo between 40 and 240 BPM.
 * 2. Execute an Acoustic 4-Beat Count-In state machine that auto-arms recording and AI companion jamming.
 */

export type CountInState = 'idle' | 'listening' | 'counting' | 'locked';

export interface TempoTrackerOptions {
  minBpm?: number;
  maxBpm?: number;
  tapTimeoutMs?: number;
  tempoToleranceRatio?: number; // Acceptable tempo variation between count-in beats (default: 0.20 = 20%)
  onCountInBeat?: (beatNumber: number, bpm: number) => void;
  onCountInComplete?: (lockedBpm: number) => void;
  onTempoUpdated?: (bpm: number) => void;
}

export class TempoTracker {
  private minBpm: number;
  private maxBpm: number;
  private tapTimeoutMs: number;
  private tempoToleranceRatio: number;

  private currentBpm: number = 120;
  private countInState: CountInState = 'idle';
  private onsetTimestamps: number[] = [];
  private countInBeats: number[] = []; // Timestamps of count-in taps (up to 4)

  private onCountInBeat?: (beatNumber: number, bpm: number) => void;
  private onCountInComplete?: (lockedBpm: number) => void;
  private onTempoUpdated?: (bpm: number) => void;

  constructor(options: TempoTrackerOptions = {}) {
    this.minBpm = options.minBpm ?? 50;
    this.maxBpm = options.maxBpm ?? 220;
    this.tapTimeoutMs = options.tapTimeoutMs ?? 2500; // Reset after 2.5s of silence
    this.tempoToleranceRatio = options.tempoToleranceRatio ?? 0.25;
    this.onCountInBeat = options.onCountInBeat;
    this.onCountInComplete = options.onCountInComplete;
    this.onTempoUpdated = options.onTempoUpdated;
  }

  public getBpm(): number {
    return Math.round(this.currentBpm);
  }

  public setBpm(bpm: number): void {
    this.currentBpm = Math.max(this.minBpm, Math.min(this.maxBpm, bpm));
    this.onTempoUpdated?.(this.currentBpm);
  }

  public getCountInState(): CountInState {
    return this.countInState;
  }

  public armCountIn(): void {
    this.countInState = 'listening';
    this.countInBeats = [];
  }

  public disarmCountIn(): void {
    this.countInState = 'idle';
    this.countInBeats = [];
  }

  /**
   * Called whenever an acoustic peak/transient or manual tap event occurs.
   */
  public registerOnset(timestamp: number = Date.now()): void {
    // 1. Maintain rolling onset history for general tempo estimation
    this.onsetTimestamps.push(timestamp);
    const cutoff = timestamp - 4000; // 4 second rolling window
    while (this.onsetTimestamps.length > 0 && this.onsetTimestamps[0] < cutoff) {
      this.onsetTimestamps.shift();
    }

    if (this.onsetTimestamps.length >= 3) {
      const estimated = this.calculateBpmFromIntervals(this.onsetTimestamps);
      if (estimated !== null) {
        this.currentBpm = estimated;
        this.onTempoUpdated?.(this.currentBpm);
      }
    }

    // 2. Acoustic Count-In State Machine
    if (this.countInState === 'listening' || this.countInState === 'counting') {
      this.processCountInTap(timestamp);
    }
  }

  private processCountInTap(now: number): void {
    if (this.countInBeats.length > 0) {
      const lastTap = this.countInBeats[this.countInBeats.length - 1];
      const deltaMs = now - lastTap;

      // If too much time has elapsed, reset count-in
      if (deltaMs > this.tapTimeoutMs) {
        this.countInBeats = [now];
        this.countInState = 'listening';
        this.onCountInBeat?.(1, this.currentBpm);
        return;
      }

      // Check if tap is too fast (debounce < 150ms = > 400 BPM)
      if (deltaMs < 150) {
        return;
      }
    }

    this.countInBeats.push(now);
    const beatIndex = this.countInBeats.length;

    if (beatIndex === 1) {
      this.countInState = 'counting';
      this.onCountInBeat?.(1, this.currentBpm);
    } else if (beatIndex <= 3) {
      // Calculate instantaneous interval
      const intervals: number[] = [];
      for (let i = 1; i < this.countInBeats.length; i++) {
        intervals.push(this.countInBeats[i] - this.countInBeats[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = 60000 / avgInterval;
      if (bpm >= this.minBpm && bpm <= this.maxBpm) {
        this.currentBpm = Math.round(bpm);
        this.onTempoUpdated?.(this.currentBpm);
      }
      this.onCountInBeat?.(beatIndex, this.currentBpm);
    } else if (beatIndex >= 4) {
      // 4th beat reached! Verify consistency of intervals
      const i1 = this.countInBeats[1] - this.countInBeats[0];
      const i2 = this.countInBeats[2] - this.countInBeats[1];
      const i3 = this.countInBeats[3] - this.countInBeats[2];
      const avgInterval = (i1 + i2 + i3) / 3;

      const maxDev = Math.max(
        Math.abs(i1 - avgInterval),
        Math.abs(i2 - avgInterval),
        Math.abs(i3 - avgInterval)
      );

      // Verify that rhythm is steady within tolerance
      if (maxDev / avgInterval <= this.tempoToleranceRatio) {
        const lockedBpm = Math.round(60000 / avgInterval);
        this.currentBpm = Math.max(this.minBpm, Math.min(this.maxBpm, lockedBpm));
        this.countInState = 'locked';
        this.onCountInBeat?.(4, this.currentBpm);
        this.onCountInComplete?.(this.currentBpm);
        this.countInBeats = [];
      } else {
        // Uneven count-in rhythm -> reset to beat 1
        this.countInBeats = [now];
        this.countInState = 'counting';
        this.onCountInBeat?.(1, this.currentBpm);
      }
    }
  }

  private calculateBpmFromIntervals(timestamps: number[]): number | null {
    if (timestamps.length < 3) return null;
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      const diff = timestamps[i] - timestamps[i - 1];
      if (diff >= (60000 / this.maxBpm) * 0.7 && diff <= (60000 / this.minBpm) * 1.5) {
        intervals.push(diff);
      }
    }
    if (intervals.length === 0) return null;
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = 60000 / avg;
    if (bpm < this.minBpm || bpm > this.maxBpm) return null;
    return Math.round(bpm);
  }
}

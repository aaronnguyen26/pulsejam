import { PerformanceTier, StemBuffers } from './types';
import { CROSSFADE_DURATION_MS } from './constants';

/**
 * StemEngine
 *
 * Manages synchronous looping stem audio playback across 3 tiers (Chill, Groove, Peak).
 * Implements mathematical equal-power crossfading (cos/sin gain curve) over 100ms.
 */
export class StemEngine {
  private ctx: AudioContext;
  private sources: Record<PerformanceTier, AudioBufferSourceNode | null> = {
    chill: null,
    groove: null,
    peak: null,
  };
  private gainNodes: Record<PerformanceTier, GainNode | null> = {
    chill: null,
    groove: null,
    peak: null,
  };
  private masterGainNode: GainNode;

  private currentActiveTier: PerformanceTier = 'chill';
  private isPlaying = false;
  private startTime = 0;
  private loopDurationSeconds = 8.0; // 4 bars at 120 BPM

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterGainNode = this.ctx.createGain();
    this.masterGainNode.gain.value = 0.85;
    this.masterGainNode.connect(this.ctx.destination);
  }

  public initStems(stems: StemBuffers) {
    this.stop();

    const tiers: PerformanceTier[] = ['chill', 'groove', 'peak'];
    this.loopDurationSeconds = stems.chill.duration;

    tiers.forEach((tier) => {
      const buffer = stems[tier];
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = this.ctx.createGain();
      // Set initial gain: 1.0 for initial active tier (chill), 0.0 for others
      const initialGain = tier === this.currentActiveTier ? 1.0 : 0.0;
      gain.gain.setValueAtTime(initialGain, this.ctx.currentTime);

      source.connect(gain);
      gain.connect(this.masterGainNode);

      this.sources[tier] = source;
      this.gainNodes[tier] = gain;
    });
  }

  public start() {
    if (this.isPlaying) return;

    const now = this.ctx.currentTime + 0.05; // Small buffer delay to avoid click
    this.startTime = now;

    const tiers: PerformanceTier[] = ['chill', 'groove', 'peak'];
    tiers.forEach((tier) => {
      if (this.sources[tier]) {
        this.sources[tier]!.start(now);
      }
    });

    this.isPlaying = true;
  }

  public stop() {
    const tiers: PerformanceTier[] = ['chill', 'groove', 'peak'];
    tiers.forEach((tier) => {
      if (this.sources[tier]) {
        try {
          this.sources[tier]!.stop();
          this.sources[tier]!.disconnect();
        } catch {
          // Source may already be stopped
        }
        this.sources[tier] = null;
      }
      if (this.gainNodes[tier]) {
        this.gainNodes[tier]!.disconnect();
        this.gainNodes[tier] = null;
      }
    });
    this.isPlaying = false;
  }

  /**
   * Schedules equal-power crossfade to target tier.
   *
   * Equal-power crossfade curve:
   *  Gain_In(t) = sin( (pi / 2) * (t / T) )
   *  Gain_Out(t) = cos( (pi / 2) * (t / T) )
   */
  public transitionToTier(targetTier: PerformanceTier) {
    if (targetTier === this.currentActiveTier || !this.isPlaying) {
      return;
    }

    const previousTier = this.currentActiveTier;
    this.currentActiveTier = targetTier;

    const now = this.ctx.currentTime;
    const fadeDurationSec = CROSSFADE_DURATION_MS / 1000;

    // Calculate nearest quarter-note bar alignment (120 BPM -> 0.5s quarter note)
    const quarterNoteDurationSec = 0.5;
    const elapsedSinceStart = now - this.startTime;
    const nextBeatTime = this.startTime + Math.ceil(elapsedSinceStart / quarterNoteDurationSec) * quarterNoteDurationSec;

    // Schedule exact start time of crossfade
    const fadeStartTime = Math.max(now, nextBeatTime);
    const fadeEndTime = fadeStartTime + fadeDurationSec;

    const steps = 32;
    const fadeInCurve = new Float32Array(steps);
    const fadeOutCurve = new Float32Array(steps);

    for (let i = 0; i < steps; i++) {
      const fraction = i / (steps - 1);
      const angle = (Math.PI / 2) * fraction;
      fadeInCurve[i] = Math.sin(angle);
      fadeOutCurve[i] = Math.cos(angle);
    }

    const tiers: PerformanceTier[] = ['chill', 'groove', 'peak'];
    tiers.forEach((tier) => {
      const gainNode = this.gainNodes[tier];
      if (!gainNode) return;

      gainNode.gain.cancelScheduledValues(now);

      if (tier === targetTier) {
        // Fade in target tier using equal-power sine curve
        gainNode.gain.setValueCurveAtTime(fadeInCurve, fadeStartTime, fadeDurationSec);
        gainNode.gain.setValueAtTime(1.0, fadeEndTime);
      } else if (tier === previousTier) {
        // Fade out previous tier using equal-power cosine curve
        gainNode.gain.setValueCurveAtTime(fadeOutCurve, fadeStartTime, fadeDurationSec);
        gainNode.gain.setValueAtTime(0.0, fadeEndTime);
      } else {
        // Ensure dormant tiers remain muted
        gainNode.gain.setValueAtTime(0.0, now);
      }
    });
  }

  public setMasterVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    this.masterGainNode.gain.setValueAtTime(clamped, this.ctx.currentTime);
  }

  public getActiveTier(): PerformanceTier {
    return this.currentActiveTier;
  }
}

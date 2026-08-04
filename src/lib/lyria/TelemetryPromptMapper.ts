import { DSPMetrics, LyriaControlParams, WeightedPrompt } from '../audio/types';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getNoteName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  const name = NOTE_NAMES[pitch % 12];
  return `${name}${octave}`;
}

/**
 * TelemetryPromptMapper
 *
 * Maps live instrument DSP metrics (RMS dB, attack density, active tier, detected pitch)
 * into weighted text prompts and continuous density/brightness control parameters
 * for Google's Lyria RealTime model.
 *
 * Throttled to update every 3 seconds matching the model's response latency.
 */
export class TelemetryPromptMapper {
  private lastUpdateTimestamp = 0;
  private minUpdateIntervalMs = 3000; // 3 seconds

  private currentParams: LyriaControlParams = {
    prompts: [
      { text: 'ethereal ambient synth pad', weight: 1.0 },
      { text: 'warm chill drone', weight: 0.8 },
    ],
    density: 0.3,
    brightness: 0.4,
    bpm: 120,
  };

  public processMetrics(metrics: DSPMetrics, forceImmediate = false): LyriaControlParams {
    const now = Date.now();
    if (!forceImmediate && now - this.lastUpdateTimestamp < this.minUpdateIntervalMs) {
      return this.currentParams;
    }
    this.lastUpdateTimestamp = now;

    const { smoothedRmsDb, smoothedOnsetDensity, activeTier, currentPitch } = metrics;

    // 1. Derive Weighted Text Prompts based on Active Tier & Volume
    const prompts: WeightedPrompt[] = [];

    if (activeTier === 'chill' || smoothedRmsDb < -32) {
      prompts.push({ text: 'ethereal ambient synth pad', weight: 1.0 });
      prompts.push({ text: 'soft chill warm atmosphere', weight: 0.85 });
      prompts.push({ text: 'gentle drone', weight: 0.6 });
    } else if (activeTier === 'groove' || (smoothedRmsDb >= -32 && smoothedRmsDb < -18)) {
      prompts.push({ text: 'rhythmic pulse synth', weight: 1.0 });
      prompts.push({ text: 'warm groove backing synth', weight: 0.85 });
      prompts.push({ text: 'electronic harmony pad', weight: 0.7 });
    } else {
      // Peak tier / loud volume
      prompts.push({ text: 'driving energetic lead synth pulse', weight: 1.0 });
      prompts.push({ text: 'dynamic climax synth atmosphere', weight: 0.9 });
      prompts.push({ text: 'bright electronic texture', weight: 0.75 });
    }

    // Append key context if monophonic pitch is detected
    if (currentPitch !== undefined && currentPitch !== null && currentPitch > 0) {
      const noteName = getNoteName(currentPitch);
      prompts.push({ text: `harmonic key of ${noteName}`, weight: 0.7 });
    }

    // 2. Derive Continuous Density (0.1 to 1.0)
    // Attack density is typically 0 to 8 attacks/sec
    const rawDensity = Math.min(1.0, Math.max(0.1, smoothedOnsetDensity / 6.0));
    const density = Math.round(rawDensity * 100) / 100;

    // 3. Derive Continuous Brightness (0.1 to 1.0)
    // Higher volume and higher pitch boost brightness
    const normalizedVol = Math.min(1.0, Math.max(0.1, (smoothedRmsDb + 50) / 45));
    const pitchFactor = currentPitch ? Math.min(1.0, Math.max(0.2, (currentPitch - 36) / 48)) : 0.5;
    const rawBrightness = 0.5 * normalizedVol + 0.5 * pitchFactor;
    const brightness = Math.round(Math.min(1.0, Math.max(0.1, rawBrightness)) * 100) / 100;

    this.currentParams = {
      prompts,
      density,
      brightness,
      bpm: 120,
    };

    return this.currentParams;
  }

  public getCurrentParams(): LyriaControlParams {
    return this.currentParams;
  }
}

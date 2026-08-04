import { CalibrationData } from './types';

export const DEFAULT_CALIBRATION: CalibrationData = {
  quietDb: -38,
  normalDb: -22,
  loudDb: -12,
  onsetThreshold: 3.5,
};

export const CROSSFADE_DURATION_MS = 100;
export const HYSTERESIS_DWELL_MS = 350;

export const DEFAULT_BPM = 120;
export const BEATS_PER_BAR = 4;

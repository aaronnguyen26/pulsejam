import { MIDINoteEvent, NoteSequencePayload, PerformanceTier } from './types';

// C Major Target Scale ([0, 2, 4, 5, 7, 9, 11] mod 12)
const C_MAJOR_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);

/**
 * Snaps a MIDI pitch to C Major scale.
 * Drum pitches (36, 38, 42) are excluded from scale snapping entirely.
 */
export function snapPitchToScale(pitch: number): number {
  if (typeof pitch !== 'number' || isNaN(pitch)) return pitch;
  // Exclude drum pitches (36: Kick, 38: Snare, 42: Closed Hi-Hat) from scale snapping
  if (pitch === 36 || pitch === 38 || pitch === 42) {
    return pitch;
  }

  const pitchClass = ((pitch % 12) + 12) % 12;
  if (C_MAJOR_PITCH_CLASSES.has(pitchClass)) {
    return pitch; // No-op for already in-scale pitches
  }

  const octave = Math.floor(pitch / 12);
  const scalePitches = [0, 2, 4, 5, 7, 9, 11];
  let minDiff = Infinity;
  let bestPitchClass = pitchClass;

  for (const sp of scalePitches) {
    const diff = Math.abs(sp - pitchClass);
    if (diff < minDiff) {
      minDiff = diff;
      bestPitchClass = sp;
    }
  }

  return octave * 12 + bestPitchClass;
}

export function snapSequenceToScale(seq: NoteSequencePayload | null): NoteSequencePayload | null {
  if (!seq || !seq.notes || seq.notes.length === 0) return seq;
  const snappedNotes = seq.notes.map((n) => ({
    ...n,
    pitch: snapPitchToScale(n.pitch),
  }));
  return { ...seq, notes: snappedNotes };
}

export function createInitialSeedSeq(): NoteSequencePayload {
  return {
    notes: [
      { pitch: 60, velocity: 0.8, startTime: 0, duration: 0.5 },
      { pitch: 64, velocity: 0.8, startTime: 0.5, duration: 0.5 },
      { pitch: 67, velocity: 0.8, startTime: 1.0, duration: 0.5 },
    ],
    totalTime: 2.0,
    qpm: 120,
    quantizationInfo: { stepsPerQuarter: 4 },
  };
}

export function createInitialDrumSeedSeq(activeTier: PerformanceTier = 'groove'): NoteSequencePayload {
  if (activeTier === 'chill') {
    return {
      notes: [
        { pitch: 36, velocity: 0.8, startTime: 0, duration: 0.25 },
        { pitch: 38, velocity: 0.7, startTime: 1.0, duration: 0.25 },
      ],
      totalTime: 2.0,
      qpm: 120,
      quantizationInfo: { stepsPerQuarter: 4 },
    };
  } else if (activeTier === 'peak') {
    const notes: MIDINoteEvent[] = [];
    for (let i = 0; i < 16; i++) {
      let pitch = 42;
      if (i === 0 || i === 8 || i === 10) pitch = 36;
      else if (i === 4 || i === 12) pitch = 38;
      notes.push({
        pitch,
        velocity: 0.7 + 0.1 * (i % 2),
        startTime: i * 0.125,
        duration: 0.125,
        quantizedStartStep: i,
        quantizedEndStep: i + 1,
      });
    }
    return { notes, totalTime: 2.0, qpm: 120, quantizationInfo: { stepsPerQuarter: 4 } };
  }

  return {
    notes: [
      { pitch: 36, velocity: 0.9, startTime: 0, duration: 0.25 },
      { pitch: 42, velocity: 0.6, startTime: 0.5, duration: 0.25 },
      { pitch: 38, velocity: 0.8, startTime: 1.0, duration: 0.25 },
      { pitch: 42, velocity: 0.6, startTime: 1.5, duration: 0.25 },
    ],
    totalTime: 2.0,
    qpm: 120,
    quantizationInfo: { stepsPerQuarter: 4 },
  };
}

export function createDrumPrimerFromRhythm(
  primedSequence: NoteSequencePayload | null,
  activeTier: PerformanceTier = 'groove'
): NoteSequencePayload {
  if (!primedSequence || !primedSequence.notes || primedSequence.notes.length === 0) {
    return createInitialDrumSeedSeq(activeTier);
  }

  const drumNotes: MIDINoteEvent[] = [];
  const barDuration = primedSequence.totalTime || 2.0;

  for (const n of primedSequence.notes) {
    const startTimeSec = n.startTime !== undefined
      ? n.startTime
      : ((n.quantizedStartStep || 0) * (barDuration / 16));

    const durationSec = n.duration !== undefined
      ? n.duration
      : (((n.quantizedEndStep || 1) - (n.quantizedStartStep || 0)) * (barDuration / 16));

    const step = Math.min(15, Math.max(0, Math.floor((startTimeSec % barDuration) / (barDuration / 16))));

    let drumPitch = 42; // Default Closed Hi-Hat
    if (step % 8 === 0) {
      drumPitch = 36; // Kick drum on Beat 1 & 3
    } else if (step % 4 === 0) {
      drumPitch = 38; // Snare drum on Beat 2 & 4
    } else if ((n.velocity || 0.7) > 0.8) {
      drumPitch = 38; // Accent hit -> Snare
    }

    drumNotes.push({
      pitch: drumPitch,
      startTime: startTimeSec,
      duration: Math.max(0.1, durationSec),
      velocity: n.velocity || 0.8,
    });

    // Subdivide Hi-Hats for Peak tier to encourage dense drum pattern generation
    if (activeTier === 'peak' && step % 2 === 0) {
      const subStepTime = startTimeSec + (barDuration / 32);
      if (subStepTime < barDuration) {
        drumNotes.push({
          pitch: 42,
          startTime: subStepTime,
          duration: 0.05,
          velocity: 0.6,
        });
      }
    }
  }

  return {
    notes: drumNotes,
    totalTime: barDuration,
    qpm: 120,
    quantizationInfo: { stepsPerQuarter: 4 },
  };
}

export function generateFallbackDrums(barIndex: number, activeTier: PerformanceTier = 'groove'): NoteSequencePayload {
  const notes: MIDINoteEvent[] = [];
  const totalSteps = 16;
  const syncopatedKick = barIndex % 2 === 1;

  const hiHatInterval = activeTier === 'chill' ? 4 : (activeTier === 'peak' ? 1 : 2);

  for (let i = 0; i < totalSteps; i++) {
    if (i === 0 || i === 8 || (syncopatedKick && i === 10 && activeTier !== 'chill')) {
      notes.push({ pitch: 36, velocity: 0.9, startTime: i * 0.125, duration: 0.125, quantizedStartStep: i, quantizedEndStep: i + 1 });
    }
    if (i === 4 || i === 12) {
      notes.push({ pitch: 38, velocity: 0.8, startTime: i * 0.125, duration: 0.125, quantizedStartStep: i, quantizedEndStep: i + 1 });
    }
    if (i % hiHatInterval === 0) {
      notes.push({ pitch: 42, velocity: activeTier === 'chill' ? 0.4 : 0.6, startTime: i * 0.125, duration: 0.125, quantizedStartStep: i, quantizedEndStep: i + 1 });
    }
  }
  return { notes, totalTime: 2.0, qpm: 120 };
}

export function generateFallbackMelody(
  primedSeq: NoteSequencePayload | null,
  barIndex: number,
  activeTier: PerformanceTier = 'groove'
): NoteSequencePayload {
  const notes: MIDINoteEvent[] = [];
  const basePitch = (primedSeq && primedSeq.notes && primedSeq.notes.length > 0)
    ? primedSeq.notes[primedSeq.notes.length - 1].pitch
    : 60;

  const chordRoots = [0, 5, 7, 9, 2, 5, 7, 0];
  const rootShift = chordRoots[barIndex % chordRoots.length];
  const scaleOffset = [0, 2, 4, 7, 9, 12, 14, 12];

  const stepIncrement = activeTier === 'chill' ? 4 : (activeTier === 'peak' ? 1 : 2);

  for (let step = 0; step < 16; step += stepIncrement) {
    const scaleIdx = (Math.floor(step / 2) + Math.floor(barIndex / 2)) % scaleOffset.length;
    let pitch = basePitch + rootShift + scaleOffset[scaleIdx];
    while (pitch > 84) pitch -= 12;
    while (pitch < 48) pitch += 12;

    notes.push({
      pitch,
      velocity: 0.7 + 0.1 * ((step + barIndex) % 3),
      startTime: step * 0.125,
      duration: stepIncrement * 0.125,
      quantizedStartStep: step,
      quantizedEndStep: Math.min(16, step + stepIncrement),
    });
  }
  return { notes, totalTime: 2.0, qpm: 120 };
}

export function deriveBasslineSequence(
  melodySeq: NoteSequencePayload | null,
  barIndex: number = 0
): NoteSequencePayload {
  if (!melodySeq || !melodySeq.notes || melodySeq.notes.length === 0) {
    return generateFallbackBass(barIndex);
  }
  const ROOT_C = 36; // C2 (MIDI 36)
  const FIFTH_G = 43; // G2 (MIDI 43)

  const bassNotes = melodySeq.notes.map((n) => {
    const step = n.quantizedStartStep !== undefined
      ? n.quantizedStartStep
      : (n.startTime !== undefined ? Math.floor((n.startTime % 2.0) / 0.125) : -1);

    let pitch = n.pitch;

    // Downbeat root-locking (step 0 -> Root C2, step 8 -> Fifth G2)
    if (step === 0) {
      pitch = ROOT_C;
    } else if (step === 8) {
      pitch = FIFTH_G;
    } else {
      // Off-downbeats: transpose/clamp into low bass register E1 to E3 (MIDI 28 to 52)
      while (pitch > 52) pitch -= 12;
      while (pitch < 28) pitch += 12;
    }

    return {
      ...n,
      pitch,
      velocity: Math.max(0.6, (n.velocity || 0.8) * 0.95),
    };
  });
  return { ...melodySeq, notes: bassNotes };
}

export function generateFallbackBass(barIndex: number): NoteSequencePayload {
  const notes: MIDINoteEvent[] = [];
  const ROOT_C = 36; // C2
  const FIFTH_G = 43; // G2

  for (let step = 0; step < 16; step += 2) {
    let pitch = 36;
    if (step === 0) pitch = ROOT_C;
    else if (step === 8) pitch = FIFTH_G;
    else pitch = step % 4 === 0 ? 41 : 38;

    notes.push({
      pitch,
      velocity: step % 8 === 0 ? 0.85 : 0.7,
      startTime: step * 0.125,
      duration: 0.25,
      quantizedStartStep: step,
      quantizedEndStep: step + 2,
    });
  }
  return { notes, totalTime: 2.0, qpm: 120 };
}

export function getTemperatureForTier(tier: PerformanceTier | string): number {
  const temperatureMap: Record<string, number> = {
    chill: 0.7,
    groove: 1.0,
    peak: 1.2,
  };
  return temperatureMap[tier] ?? 1.0;
}

export interface ModelAdapter {
  continueSequence: (seq: NoteSequencePayload, steps: number, temp: number) => Promise<NoteSequencePayload>;
}

export async function generateBarWithModels(
  payload: {
    primedSequence?: NoteSequencePayload | null;
    stepsPerBar?: number;
    temperature?: number;
    activeTier?: PerformanceTier;
    barIndex?: number;
  },
  models: {
    drumsModel?: ModelAdapter | null;
    melodyModel?: ModelAdapter | null;
  }
): Promise<{
  drumsSequence: NoteSequencePayload | null;
  melodySequence: NoteSequencePayload | null;
  bassSequence: NoteSequencePayload | null;
  barIndex: number;
}> {
  const { primedSequence, stepsPerBar = 16, temperature = 1.0, activeTier = 'groove', barIndex = 0 } = payload || {};

  let generatedDrums: NoteSequencePayload | null = null;
  let generatedMelody: NoteSequencePayload | null = null;

  const effectiveMelodySeq = (primedSequence && primedSequence.notes && primedSequence.notes.length > 0)
    ? primedSequence
    : createInitialSeedSeq();

  // 1. MelodyRNN Inference (Independent try/catch with melody-pitched primer & tier temperature)
  if (models?.melodyModel && typeof models.melodyModel.continueSequence === 'function') {
    try {
      generatedMelody = await models.melodyModel.continueSequence(effectiveMelodySeq, stepsPerBar, temperature);
    } catch (melodyErr) {
      generatedMelody = generateFallbackMelody(effectiveMelodySeq, barIndex, activeTier);
    }
  } else {
    generatedMelody = generateFallbackMelody(effectiveMelodySeq, barIndex, activeTier);
  }

  // 2. DrumsRNN Inference (Independent try/catch with rhythm/onset-mapped drum primer & tier temperature)
  if (models?.drumsModel && typeof models.drumsModel.continueSequence === 'function') {
    try {
      const drumPrimer = createDrumPrimerFromRhythm(primedSequence || null, activeTier);
      generatedDrums = await models.drumsModel.continueSequence(drumPrimer, stepsPerBar, temperature);
    } catch (drumsErr) {
      generatedDrums = generateFallbackDrums(barIndex, activeTier);
    }
  } else {
    generatedDrums = generateFallbackDrums(barIndex, activeTier);
  }

  // 3. Post-Generation Scale Snapping & Root-Locked Bass Derivation
  generatedMelody = snapSequenceToScale(generatedMelody);
  const generatedBass = snapSequenceToScale(deriveBasslineSequence(generatedMelody, barIndex));

  return {
    drumsSequence: generatedDrums,
    melodySequence: generatedMelody,
    bassSequence: generatedBass,
    barIndex,
  };
}

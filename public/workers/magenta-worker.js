/**
 * Magenta.js & TensorFlow.js WASM Web Worker
 *
 * Dedicated worker thread for client-side local AI MIDI generation.
 * Runs DrumsRNN & MelodyRNN model inference off the main thread & audio thread.
 */

// Import TensorFlow.js & Magenta.js via Worker importScripts for zero-bundler Web Worker compatibility
try {
  importScripts(
    'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js',
    'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.17.0/dist/tf-backend-wasm.min.js',
    'https://cdn.jsdelivr.net/npm/@magenta/music@1.23.1/dist/magentamusic.min.js'
  );
} catch (e) {
  console.warn('Magenta Web Worker CDN script import warning:', e);
}

let isInitialized = false;
let drumsModel = null;
let melodyModel = null;

const DRUMS_CHECKPOINT = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit';
const MELODY_CHECKPOINT = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn';

async function initModels() {
  if (isInitialized) return true;

  try {
    // Configure WASM backend specifically for Web Worker context
    if (typeof tf !== 'undefined' && tf.setBackend) {
      tf.wasm.setWasmPaths('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.17.0/dist/');
      await tf.setBackend('wasm');
      await tf.ready();
    }

    if (typeof mm !== 'undefined' && mm.MusicRNN) {
      drumsModel = new mm.MusicRNN(DRUMS_CHECKPOINT);
      melodyModel = new mm.MusicRNN(MELODY_CHECKPOINT);

      await Promise.all([drumsModel.initialize(), melodyModel.initialize()]);
      isInitialized = true;
      postMessage({ type: 'WORKER_READY', payload: { backend: 'wasm' } });
      return true;
    } else {
      // Fallback local pattern generator if CDN scripts blocked
      isInitialized = true;
      postMessage({ type: 'WORKER_READY', payload: { backend: 'fallback-algorithmic' } });
      return true;
    }
  } catch (err) {
    console.warn('Magenta worker initialization error, activating fallback generator:', err);
    isInitialized = true;
    postMessage({ type: 'WORKER_READY', payload: { backend: 'fallback-algorithmic' } });
    return true;
  }
}

// Primary Worker Message Router
self.onmessage = async (event) => {
  const { type, payload } = event.data || {};

  if (type === 'INIT_WORKER') {
    await initModels();
  } else if (type === 'GENERATE_BAR') {
    const startTime = performance.now();
    const { primedSequence, stepsPerBar = 16, temperature = 1.0, barIndex = 0 } = payload || {};

    let generatedDrums = null;
    let generatedMelody = null;

    const effectiveMelodySeq = (primedSequence && primedSequence.notes && primedSequence.notes.length > 0)
      ? primedSequence
      : createInitialSeedSeq();

    // 1. MelodyRNN Inference (Independent try/catch with melody-pitched primer)
    if (isInitialized && melodyModel && melodyModel.isInitialized()) {
      try {
        const qMelodySeq = mm.sequences.quantizeNoteSequence(effectiveMelodySeq, 4);
        generatedMelody = await melodyModel.continueSequence(qMelodySeq, stepsPerBar, temperature);
      } catch (melodyErr) {
        console.warn('MelodyRNN inference error, using algorithmic continuation:', melodyErr);
        generatedMelody = generateFallbackMelody(effectiveMelodySeq, barIndex);
      }
    } else {
      generatedMelody = generateFallbackMelody(effectiveMelodySeq, barIndex);
    }

    // 2. DrumsRNN Inference (Independent try/catch with rhythm/onset-mapped drum primer)
    if (isInitialized && drumsModel && drumsModel.isInitialized()) {
      try {
        const drumPrimer = createDrumPrimerFromRhythm(primedSequence);
        const qDrumsSeq = mm.sequences.quantizeNoteSequence(drumPrimer, 4);
        generatedDrums = await drumsModel.continueSequence(qDrumsSeq, stepsPerBar, temperature);
      } catch (drumsErr) {
        console.warn('DrumsRNN inference error, using algorithmic continuation:', drumsErr);
        generatedDrums = generateFallbackDrums(barIndex);
      }
    } else {
      generatedDrums = generateFallbackDrums(barIndex);
    }

    let generatedBass = deriveBasslineSequence(generatedMelody, barIndex);

    const endTime = performance.now();
    const generationLatencyMs = Math.round(endTime - startTime);

    postMessage({
      type: 'BAR_GENERATED',
      payload: {
        drumsSequence: generatedDrums,
        melodySequence: generatedMelody,
        bassSequence: generatedBass,
        barIndex,
        generationLatencyMs,
      },
    });
  }
};

function createInitialSeedSeq() {
  return {
    notes: [
      { pitch: 60, startTime: 0, endTime: 0.5 },
      { pitch: 64, startTime: 0.5, endTime: 1.0 },
      { pitch: 67, startTime: 1.0, endTime: 1.5 },
    ],
    totalTime: 2.0,
    quantizationInfo: { stepsPerQuarter: 4 },
  };
}

function createDrumPrimerFromRhythm(primedSequence) {
  if (!primedSequence || !primedSequence.notes || primedSequence.notes.length === 0) {
    return createInitialDrumSeedSeq();
  }

  const drumNotes = [];
  const barDuration = primedSequence.totalTime || 2.0;

  for (const n of primedSequence.notes) {
    const startTimeSec = n.startTime !== undefined
      ? n.startTime
      : ((n.quantizedStartStep || 0) * (barDuration / 16));

    const durationSec = n.duration !== undefined
      ? n.duration
      : (((n.quantizedEndStep || 1) - (n.quantizedStartStep || 0)) * (barDuration / 16));

    const step = Math.min(15, Math.max(0, Math.floor((startTimeSec % barDuration) / (barDuration / 16))));

    // Map rhythmic step & accent to valid Magenta drum vocabulary pitches
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
      endTime: Math.min(barDuration, startTimeSec + Math.max(0.1, durationSec)),
      velocity: n.velocity || 0.8,
    });
  }

  return {
    notes: drumNotes,
    totalTime: barDuration,
    quantizationInfo: { stepsPerQuarter: 4 },
  };
}

function createInitialDrumSeedSeq() {
  return {
    notes: [
      { pitch: 36, startTime: 0, endTime: 0.25, velocity: 0.9 },
      { pitch: 42, startTime: 0.5, endTime: 0.75, velocity: 0.6 },
      { pitch: 38, startTime: 1.0, endTime: 1.25, velocity: 0.8 },
      { pitch: 42, startTime: 1.5, endTime: 1.75, velocity: 0.6 },
    ],
    totalTime: 2.0,
    quantizationInfo: { stepsPerQuarter: 4 },
  };
}

// Algorithmic Fallback Generator (guarantees zero silence when offline / loading)
function generateFallbackDrums(barIndex) {
  const notes = [];
  const totalSteps = 16;
  const syncopatedKick = barIndex % 2 === 1;

  for (let i = 0; i < totalSteps; i++) {
    // Kick on 0, 8, plus beat 3 variation on odd bars
    if (i === 0 || i === 8 || (syncopatedKick && i === 10)) {
      notes.push({ pitch: 36, quantizedStartStep: i, quantizedEndStep: i + 1, velocity: 0.9 });
    }
    // Snare on 4, 12 (Beat 2 & 4)
    if (i === 4 || i === 12) {
      notes.push({ pitch: 38, quantizedStartStep: i, quantizedEndStep: i + 1, velocity: 0.8 });
    }
    // Hi-Hat on 8th notes
    if (i % 2 === 0) {
      notes.push({ pitch: 42, quantizedStartStep: i, quantizedEndStep: i + 1, velocity: 0.5 });
    }
  }
  return { notes, totalQuantizedSteps: 16 };
}

function generateFallbackMelody(primedSeq, barIndex) {
  const notes = [];
  const basePitch = (primedSeq && primedSeq.notes && primedSeq.notes.length > 0)
    ? primedSeq.notes[primedSeq.notes.length - 1].pitch
    : 60;

  // Harmonically evolving chord progression across bars (I - IV - V - vi)
  const chordRoots = [0, 5, 7, 9, 2, 5, 7, 0];
  const rootShift = chordRoots[barIndex % chordRoots.length];
  const scaleOffset = [0, 2, 4, 7, 9, 12, 14, 12];

  for (let step = 0; step < 16; step += 2) {
    const scaleIdx = (step / 2 + Math.floor(barIndex / 2)) % scaleOffset.length;
    let pitch = basePitch + rootShift + scaleOffset[scaleIdx];
    // Keep in musical range C3-C6 (48-84)
    while (pitch > 84) pitch -= 12;
    while (pitch < 48) pitch += 12;

    notes.push({
      pitch,
      quantizedStartStep: step,
      quantizedEndStep: step + 2,
      velocity: 0.7 + 0.1 * ((step + barIndex) % 3),
    });
  }
  return { notes, totalQuantizedSteps: 16 };
}

function deriveBasslineSequence(melodySeq, barIndex) {
  if (!melodySeq || !melodySeq.notes || melodySeq.notes.length === 0) {
    return generateFallbackBass(barIndex);
  }
  const bassNotes = melodySeq.notes.map((n) => {
    let pitch = n.pitch;
    // Transpose/clamp into low bass register E1 to E3 (MIDI 28 to 52)
    while (pitch > 52) pitch -= 12;
    while (pitch < 28) pitch += 12;
    return {
      ...n,
      pitch,
      velocity: Math.max(0.6, (n.velocity || 0.8) * 0.95),
    };
  });
  return { ...melodySeq, notes: bassNotes };
}

function generateFallbackBass(barIndex) {
  const notes = [];
  const chordRoots = [36, 41, 43, 45, 38, 41, 43, 36]; // C2, F2, G2, A2, D2, F2, G2, C2
  const rootPitch = chordRoots[barIndex % chordRoots.length];

  for (let step = 0; step < 16; step += 2) {
    const isRoot = step % 4 === 0;
    const pitch = isRoot ? rootPitch : (rootPitch + 7 > 52 ? rootPitch - 5 : rootPitch + 7);
    notes.push({
      pitch,
      quantizedStartStep: step,
      quantizedEndStep: step + 2,
      velocity: isRoot ? 0.85 : 0.7,
    });
  }
  return { notes, totalQuantizedSteps: 16 };
}

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

    if (isInitialized && drumsModel && melodyModel && drumsModel.isInitialized() && melodyModel.isInitialized()) {
      try {
        const qSeq = mm.sequences.quantizeNoteSequence(primedSequence || createDefaultPrimedSeq(), 4);
        
        // Parallel DrumsRNN & MelodyRNN continuation inference
        [generatedDrums, generatedMelody] = await Promise.all([
          drumsModel.continueSequence(qSeq, stepsPerBar, temperature),
          melodyModel.continueSequence(qSeq, stepsPerBar, temperature),
        ]);
      } catch (inferenceErr) {
        console.warn('Magenta model inference error, producing algorithmic continuation:', inferenceErr);
        generatedDrums = generateFallbackDrums(barIndex);
        generatedMelody = generateFallbackMelody(primedSequence, barIndex);
      }
    } else {
      // Algorithmic fallback generator
      generatedDrums = generateFallbackDrums(barIndex);
      generatedMelody = generateFallbackMelody(primedSequence, barIndex);
    }

    const endTime = performance.now();
    const generationLatencyMs = Math.round(endTime - startTime);

    postMessage({
      type: 'BAR_GENERATED',
      payload: {
        drumsSequence: generatedDrums,
        melodySequence: generatedMelody,
        barIndex,
        generationLatencyMs,
      },
    });
  }
};

function createDefaultPrimedSeq() {
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

// Algorithmic Fallback Generator (guarantees zero silence when offline / loading)
function generateFallbackDrums(barIndex) {
  const notes = [];
  const totalSteps = 16;
  for (let i = 0; i < totalSteps; i++) {
    // Kick on 0, 8 (Beat 1 & 3)
    if (i === 0 || i === 8) {
      notes.push({ pitch: 36, quantizedStartStep: i, quantizedEndStep: i + 1, velocity: 0.9 });
    }
    // Snare on 4, 12 (Beat 2 & 4)
    if (i === 4 || i === 12) {
      notes.push({ pitch: 38, quantizedStartStep: i, quantizedEndStep: i + 1, velocity: 0.8 });
    }
    // Hi-Hat on 8th notes (0, 2, 4, 6, 8, 10, 12, 14)
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
    : 48; // C3 bass

  const scaleOffset = [0, 2, 4, 7, 9, 12];
  for (let step = 0; step < 16; step += 2) {
    const pitch = basePitch + scaleOffset[(step / 2 + barIndex) % scaleOffset.length];
    notes.push({
      pitch,
      quantizedStartStep: step,
      quantizedEndStep: step + 2,
      velocity: 0.7,
    });
  }
  return { notes, totalQuantizedSteps: 16 };
}

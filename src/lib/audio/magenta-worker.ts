/**
 * Magenta.js & TensorFlow.js WASM Web Worker
 *
 * Dedicated worker thread for client-side local AI MIDI generation.
 * Imports pure algorithmic & scale logic directly from magentaLogic.ts.
 */

import {
  createDrumPrimerFromRhythm,
  createInitialSeedSeq,
  deriveBasslineSequence,
  generateFallbackDrums,
  generateFallbackMelody,
  snapSequenceToScale,
} from './magentaLogic';

declare const importScripts: (...urls: string[]) => void;
declare const tf: any;
declare const mm: any;

let isInitialized = false;
let drumsModel: any = null;
let melodyModel: any = null;

const DRUMS_CHECKPOINT = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit';
const MELODY_CHECKPOINT = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn';

async function initModels() {
  if (isInitialized) return true;

  try {
    // Import CDN scripts inside worker context
    try {
      importScripts(
        'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js',
        'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.17.0/dist/tf-backend-wasm.min.js',
        'https://cdn.jsdelivr.net/npm/@magenta/music@1.23.1/dist/magentamusic.min.js'
      );
    } catch (e) {
      console.warn('Magenta Web Worker CDN script import warning:', e);
    }

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

self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data || {};

  if (type === 'INIT_WORKER') {
    await initModels();
  } else if (type === 'GENERATE_BAR') {
    const startTime = performance.now();
    const { primedSequence, stepsPerBar = 16, temperature = 1.0, activeTier = 'groove', barIndex = 0 } = payload || {};

    let generatedDrums = null;
    let generatedMelody = null;

    const effectiveMelodySeq = (primedSequence && primedSequence.notes && primedSequence.notes.length > 0)
      ? primedSequence
      : createInitialSeedSeq();

    // 1. MelodyRNN Inference using shared fallback logic
    if (isInitialized && melodyModel && melodyModel.isInitialized()) {
      try {
        const qMelodySeq = mm.sequences.quantizeNoteSequence(effectiveMelodySeq, 4);
        generatedMelody = await melodyModel.continueSequence(qMelodySeq, stepsPerBar, temperature);
      } catch (melodyErr) {
        console.warn('MelodyRNN inference error, using algorithmic continuation:', melodyErr);
        generatedMelody = generateFallbackMelody(effectiveMelodySeq, barIndex, activeTier);
      }
    } else {
      generatedMelody = generateFallbackMelody(effectiveMelodySeq, barIndex, activeTier);
    }

    // 2. DrumsRNN Inference using shared createDrumPrimerFromRhythm
    if (isInitialized && drumsModel && drumsModel.isInitialized()) {
      try {
        const drumPrimer = createDrumPrimerFromRhythm(primedSequence, activeTier);
        const qDrumsSeq = mm.sequences.quantizeNoteSequence(drumPrimer, 4);
        generatedDrums = await drumsModel.continueSequence(qDrumsSeq, stepsPerBar, temperature);
      } catch (drumsErr) {
        console.warn('DrumsRNN inference error, using algorithmic continuation:', drumsErr);
        generatedDrums = generateFallbackDrums(barIndex, activeTier);
      }
    } else {
      generatedDrums = generateFallbackDrums(barIndex, activeTier);
    }

    // 3. Post-Generation Scale Snapping & Root-Locked Bass Derivation using shared functions
    generatedMelody = snapSequenceToScale(generatedMelody);
    const generatedBass = snapSequenceToScale(deriveBasslineSequence(generatedMelody, barIndex));

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

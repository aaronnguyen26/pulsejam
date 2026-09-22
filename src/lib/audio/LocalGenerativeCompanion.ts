/**
 * PulseJam — LocalGenerativeCompanion
 *
 * Client-side real-time generative music engine running 100% in-browser.
 * Consumes 40ms ConditioningFrames (pitch onsets, key center, chroma vector, active tier, style preset)
 * and generates continuous 48kHz stereo Float32 PCM audio frames with the standard
 * 16-byte PulseJam binary header (0x504A) for zero-latency playback through AIAudioReceiver.
 */

import {
  BINARY_HEADER_SIZE,
  BINARY_MAGIC,
  BinaryMessageType,
  ConditioningFrame,
  PerformanceTier,
} from './types';
import { AIAudioReceiver } from './AIAudioReceiver';

export interface GenerativeVoiceState {
  bassFreq: number;
  bassPhase: number;
  bassEnv: number;
  leadFreq: number;
  leadPhase: number;
  leadEnv: number;
  padFreqs: number[];
  padPhases: number[];
  padEnv: number;
  drumStep: number;
  drumSampleCounter: number;
}

export class LocalGenerativeCompanion {
  private receiver: AIAudioReceiver | null = null;
  private sampleRate = 48000;
  private chunkDurationMs = 40; // 40ms = 1920 samples @ 48kHz
  private samplesPerChunk: number;

  private isRunning = false;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private sequenceNumber = 0;

  // Active conditioning parameters
  private currentTier: PerformanceTier = 'chill';
  private currentKey = 'A Minor';
  private currentBpm = 92;
  private lastPitch: number | null = null;
  private noteOnTime = 0;

  // Synthesis state
  private voice: GenerativeVoiceState = {
    bassFreq: 110, // A2
    bassPhase: 0,
    bassEnv: 0,
    leadFreq: 220, // A3
    leadPhase: 0,
    leadEnv: 0,
    padFreqs: [220, 261.63, 329.63], // Am triad (A3, C4, E4)
    padPhases: [0, 0, 0],
    padEnv: 0.0,
    drumStep: 0,
    drumSampleCounter: 0,
  };

  // Drum noise generator seed
  private noiseSeed = 0.5;

  constructor(sampleRate = 48000, chunkDurationMs = 40) {
    this.sampleRate = sampleRate;
    this.chunkDurationMs = chunkDurationMs;
    this.samplesPerChunk = Math.floor((sampleRate * chunkDurationMs) / 1000); // 1920 samples
  }

  public attachReceiver(receiver: AIAudioReceiver | null): void {
    this.receiver = receiver;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.sequenceNumber = 0;

    // Generate and push a 40ms chunk every 40ms
    this.intervalTimer = setInterval(() => {
      this.generateAndPushChunk();
    }, this.chunkDurationMs);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  public setBpm(bpm: number): void {
    if (bpm >= 40 && bpm <= 240) {
      this.currentBpm = bpm;
    }
  }

  public getBpm(): number {
    return this.currentBpm;
  }

  public updateConditioning(frame: ConditioningFrame): void {
    if (frame.estimatedBpm && frame.estimatedBpm >= 40 && frame.estimatedBpm <= 240) {
      this.currentBpm = frame.estimatedBpm;
    }

    if (frame.estimatedKey) {
      this.currentKey = frame.estimatedKey;
      this.updateHarmonicPads(frame.estimatedKey);
    } else if (frame.chromaVector && frame.chromaVector.length === 12) {
      // ── FIX: No key estimate yet — derive pad tones directly from chroma energy peaks.
      //         This ensures the companion plays something harmonically relevant from the
      //         first note, rather than being stuck on the hardcoded A Minor default.
      this.updatePadsFromChroma(frame.chromaVector);
    }

    // Inspect 128-element pitch state for onsets (2) or active pitches
    if (frame.pitchState && frame.pitchState.length === 128) {
      let activePitch: number | null = null;
      for (let p = 0; p < 128; p++) {
        if (frame.pitchState[p] === 2) {
          // Onset
          activePitch = p;
          break;
        } else if (frame.pitchState[p] === 1 && activePitch === null) {
          activePitch = p;
        }
      }

      if (activePitch !== null) {
        this.lastPitch = activePitch;
        this.noteOnTime = Date.now();
        this.triggerHarmonicResponse(activePitch);

        // ── FIX: When no estimatedKey is in the frame, update the pads to match
        //         the played pitch so the accompaniment tracks the user in real time.
        if (!frame.estimatedKey) {
          this.updateHarmonicPadsFromPitch(activePitch);
        }
      }
    }

    // Tier mapping from stylePrompt
    if (frame.stylePrompt) {
      if (frame.stylePrompt.includes('driving') || frame.stylePrompt.includes('energetic')) {
        this.currentTier = 'peak';
      } else if (frame.stylePrompt.includes('groove') || frame.stylePrompt.includes('steady')) {
        this.currentTier = 'groove';
      } else {
        this.currentTier = 'chill';
      }
    }
  }


  private triggerHarmonicResponse(midiPitch: number): void {
    // Convert MIDI pitch to Hz
    const freq = 440 * Math.pow(2, (midiPitch - 69) / 12);

    // Complementary bass note (1 or 2 octaves below root)
    const bassMidi = Math.max(28, (midiPitch % 12) + 36); // in C2-B2 octave
    this.voice.bassFreq = 440 * Math.pow(2, (bassMidi - 69) / 12);
    this.voice.bassEnv = 1.0;

    // Counter-melody lead (a fifth or third above)
    const leadMidi = midiPitch + 7; // fifth above
    this.voice.leadFreq = 440 * Math.pow(2, (leadMidi - 69) / 12);
    this.voice.leadEnv = 0.8;

    // Trigger pad envelope
    this.voice.padEnv = 1.0;
  }

  private updateHarmonicPads(key: string): void {
    // Simple key-to-pad triad mapping
    const rootName = key.split(' ')[0] || 'A';
    const isMinor = key.includes('Minor') || key.includes('minor');

    const noteToMidi: Record<string, number> = {
      C: 60, 'C#': 61, D: 62, 'D#': 63, E: 64, F: 65,
      'F#': 66, G: 67, 'G#': 68, A: 57, 'A#': 58, B: 59,
    };

    const rootMidi = noteToMidi[rootName] ?? 57;
    const thirdMidi = rootMidi + (isMinor ? 3 : 4);
    const fifthMidi = rootMidi + 7;

    this.voice.padFreqs = [
      440 * Math.pow(2, (rootMidi - 69) / 12),
      440 * Math.pow(2, (thirdMidi - 69) / 12),
      440 * Math.pow(2, (fifthMidi - 69) / 12),
    ];
    this.voice.padEnv = 1.0;
    this.noteOnTime = Date.now();
  }

  /**
   * ── FIX: Derive pad tones directly from chroma energy when no key estimate is
   * available. Picks the 3 most energetic pitch classes and voices them as a chord
   * in the mid-octave range so the companion tracks the user from the first note.
   */
  private updatePadsFromChroma(chroma: number[]): void {
    // Rank pitch classes by energy, take top 3
    const ranked = chroma
      .map((energy, pc) => ({ pc, energy }))
      .sort((a, b) => b.energy - a.energy)
      .slice(0, 3)
      .sort((a, b) => a.pc - b.pc); // sort ascending for natural voicing

    // Voice in octave 3–4 range (MIDI 48–71)
    this.voice.padFreqs = ranked.map(({ pc }) => {
      const midi = pc + 60; // place in octave 4
      return 440 * Math.pow(2, (midi - 69) / 12);
    });
    this.voice.padEnv = 1.0;
    this.noteOnTime = Date.now();
  }

  /**
   * ── FIX: When pitch onset fires but no key estimate exists, build a simple
   * contextual triad (root, minor third, fifth) from the played MIDI pitch.
   * Uses a natural minor triad by default since minor tonalities are more
   * universally consonant as an ambient backing.
   */
  private updateHarmonicPadsFromPitch(midiPitch: number): void {
    const rootMidi = midiPitch;
    const thirdMidi = rootMidi + 3; // default minor third
    const fifthMidi = rootMidi + 7; // perfect fifth

    this.voice.padFreqs = [
      440 * Math.pow(2, (rootMidi - 69) / 12),
      440 * Math.pow(2, (thirdMidi - 69) / 12),
      440 * Math.pow(2, (fifthMidi - 69) / 12),
    ];
    this.voice.padEnv = 1.0;
    this.noteOnTime = Date.now();
  }

  /**
   * Generates a 40ms stereo audio chunk and pushes binary frame to AIAudioReceiver
   */
  public generateAndPushChunk(): ArrayBuffer {
    const N = this.samplesPerChunk; // 1920 samples
    const byteLength = BINARY_HEADER_SIZE + N * 2 * 4; // 16-byte header + 1920 * 2 channels * 4 bytes
    const buffer = new ArrayBuffer(byteLength);
    const dataView = new DataView(buffer);

    // 1. Write 16-byte Binary Header
    dataView.setUint16(0, BINARY_MAGIC, false); // 0x504A ('PJ')
    dataView.setUint16(2, BinaryMessageType.AUDIO_CHUNK, false); // 0x0001
    dataView.setUint32(4, this.sequenceNumber, false);
    const now = Date.now();
    const tsHigh = Math.floor(now / 4294967296);
    const tsLow = now >>> 0;
    dataView.setUint32(8, tsHigh, false);
    dataView.setUint32(12, tsLow, false);

    // 2. Synthesize Audio Samples into interleaved Float32 buffer
    const floatView = new Float32Array(buffer, BINARY_HEADER_SIZE, N * 2);

    const samplesPerBeat = (this.sampleRate * 60) / this.currentBpm;
    const samplesPer16th = samplesPerBeat / 4;

    const tier = this.currentTier;
    const padGain = tier === 'chill' ? 0.22 : tier === 'groove' ? 0.16 : 0.12;
    const bassGain = tier === 'chill' ? 0.18 : tier === 'groove' ? 0.28 : 0.35;
    const drumGain = tier === 'chill' ? 0.0 : tier === 'groove' ? 0.25 : 0.38;

    const isPlayerActive = this.noteOnTime > 0 && (now - this.noteOnTime) < 4000;

    for (let i = 0; i < N; i++) {
      this.voice.drumSampleCounter++;
      if (this.voice.drumSampleCounter >= samplesPer16th) {
        this.voice.drumSampleCounter = 0;
        this.voice.drumStep = (this.voice.drumStep + 1) % 16;
      }

      // --- Pad Synthesis (Warm Sine/Triangle Triad with dynamic envelope) ---
      let padSample = 0;
      if (this.voice.padEnv > 0.0001) {
        for (let p = 0; p < this.voice.padFreqs.length; p++) {
          const f = this.voice.padFreqs[p];
          this.voice.padPhases[p] = (this.voice.padPhases[p] + (2 * Math.PI * f) / this.sampleRate) % (2 * Math.PI);
          padSample += Math.sin(this.voice.padPhases[p]) * (1 / this.voice.padFreqs.length);
        }
        padSample *= (padGain * this.voice.padEnv);
        this.voice.padEnv *= 0.99985;
        if (this.voice.padEnv < 0.0001) {
          this.voice.padEnv = 0;
        }
      }

      // --- Bass Synthesis (Warm Sub + Harmonics) ---
      let bassSample = 0;
      if (this.voice.bassEnv > 0.0001) {
        this.voice.bassPhase = (this.voice.bassPhase + (2 * Math.PI * this.voice.bassFreq) / this.sampleRate) % (2 * Math.PI);
        const bassWave = Math.sin(this.voice.bassPhase) + 0.3 * Math.sin(2 * this.voice.bassPhase);
        bassSample = bassWave * this.voice.bassEnv * bassGain;
        this.voice.bassEnv *= 0.9997; // Smooth decay
        if (this.voice.bassEnv < 0.0001) {
          this.voice.bassEnv = 0;
        }
      }

      // --- Counter-Melody Lead Synthesis ---
      let leadSample = 0;
      if (this.voice.leadEnv > 0.0001) {
        this.voice.leadPhase = (this.voice.leadPhase + (2 * Math.PI * this.voice.leadFreq) / this.sampleRate) % (2 * Math.PI);
        const leadWave = (Math.sin(this.voice.leadPhase) > 0 ? 0.5 : -0.5) * 0.5; // Soft pulse
        leadSample = leadWave * this.voice.leadEnv * 0.12;
        this.voice.leadEnv *= 0.9995;
        if (this.voice.leadEnv < 0.0001) {
          this.voice.leadEnv = 0;
        }
      }

      // --- Drum Pattern Synthesis (Kick, Snare, Hi-Hat) ---
      let drumSampleL = 0;
      let drumSampleR = 0;

      if (drumGain > 0 && isPlayerActive) {
        const step = this.voice.drumStep;
        const subFrac = this.voice.drumSampleCounter / samplesPer16th;

        // Kick on 0 and 8 (beats 1 & 3)
        if ((step === 0 || step === 8) && subFrac < 0.5) {
          const kickFreq = 120 * Math.exp(-subFrac * 8);
          const kickWave = Math.sin(this.voice.drumSampleCounter * ((2 * Math.PI * kickFreq) / this.sampleRate));
          const kickEnv = Math.max(0, 1.0 - subFrac * 2.0);
          drumSampleL += kickWave * kickEnv * 0.5;
          drumSampleR += kickWave * kickEnv * 0.5;
        }

        // Snare on 4 and 12 (beats 2 & 4)
        if ((step === 4 || step === 12) && subFrac < 0.6) {
          this.noiseSeed = (this.noiseSeed * 9301 + 49297) % 233280;
          const whiteNoise = (this.noiseSeed / 233280) * 2 - 1;
          const snareEnv = Math.max(0, 1.0 - subFrac * 1.8);
          drumSampleL += whiteNoise * snareEnv * 0.35;
          drumSampleR += whiteNoise * snareEnv * 0.35;
        }

        // Hi-Hat (every 8th note for groove, every 16th for peak)
        const isHatStep = tier === 'peak' ? true : step % 2 === 0;
        if (isHatStep && subFrac < 0.3) {
          this.noiseSeed = (this.noiseSeed * 9301 + 49297) % 233280;
          const hatNoise = (this.noiseSeed / 233280) * 2 - 1;
          const hatEnv = Math.max(0, 1.0 - subFrac * 3.5);
          drumSampleL += hatNoise * hatEnv * 0.12;
          drumSampleR += hatNoise * hatEnv * 0.15; // Subtle stereo spread
        }
      }

      // Mix left and right
      const mixL = padSample + bassSample + leadSample + drumSampleL * drumGain;
      const mixR = padSample + bassSample + leadSample + drumSampleR * drumGain;

      floatView[i * 2] = Math.max(-1.0, Math.min(1.0, mixL));
      floatView[i * 2 + 1] = Math.max(-1.0, Math.min(1.0, mixR));
    }

    // 3. Push chunk to AIAudioReceiver if attached
    if (this.receiver) {
      this.receiver.pushBinaryChunk(buffer);
    }

    this.sequenceNumber++;
    return buffer;
  }
}

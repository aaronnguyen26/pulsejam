import { MIDINoteEvent, NoteSequencePayload } from './types';

/**
 * MIDISynthEngine
 *
 * Dedicated WebAudio MIDI synthesizer for Stage 2 AI Generation Mode.
 * Features isolated audio buses for Lead Synth, Bassline, and Drums Companion,
 * connected into an AI Accompaniment Master Bus and MediaStream destinations for clean, zero-bleed recording.
 */
export class MIDISynthEngine {
  private ctx: AudioContext;

  // Isolated Instrument Buses & Master AI Bus
  private leadSynthBus: GainNode;
  private basslineBus: GainNode;
  private drumsBus: GainNode;
  private aiAccompanimentMasterBus: GainNode;

  // Isolated MediaStream Destinations for Per-Track & Master Recording
  private leadSynthDest: MediaStreamAudioDestinationNode;
  private basslineDest: MediaStreamAudioDestinationNode;
  private drumsDest: MediaStreamAudioDestinationNode;
  private aiMasterDest: MediaStreamAudioDestinationNode;

  private isMuted: boolean = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // 1. Create Isolated Instrument Gain Nodes
    this.leadSynthBus = this.ctx.createGain();
    this.basslineBus = this.ctx.createGain();
    this.drumsBus = this.ctx.createGain();
    this.aiAccompanimentMasterBus = this.ctx.createGain();

    this.leadSynthBus.gain.value = 0.8;
    this.basslineBus.gain.value = 0.85;
    this.drumsBus.gain.value = 0.8;
    this.aiAccompanimentMasterBus.gain.value = 0.75;

    // 2. Route Isolated Buses into Master AI Bus
    this.leadSynthBus.connect(this.aiAccompanimentMasterBus);
    this.basslineBus.connect(this.aiAccompanimentMasterBus);
    this.drumsBus.connect(this.aiAccompanimentMasterBus);

    // 3. Route Master AI Bus into AudioContext Destination (Main Speaker Output)
    this.aiAccompanimentMasterBus.connect(this.ctx.destination);

    // 4. Create MediaStream Destinations for Isolated Per-Instrument & Master Recording
    this.leadSynthDest = this.ctx.createMediaStreamDestination();
    this.basslineDest = this.ctx.createMediaStreamDestination();
    this.drumsDest = this.ctx.createMediaStreamDestination();
    this.aiMasterDest = this.ctx.createMediaStreamDestination();

    this.leadSynthBus.connect(this.leadSynthDest);
    this.basslineBus.connect(this.basslineDest);
    this.drumsBus.connect(this.drumsDest);
    this.aiAccompanimentMasterBus.connect(this.aiMasterDest);
  }

  public getLeadSynthStream(): MediaStream {
    return this.leadSynthDest.stream;
  }

  public getBasslineStream(): MediaStream {
    return this.basslineDest.stream;
  }

  public getDrumsStream(): MediaStream {
    return this.drumsDest.stream;
  }

  public getAIMasterStream(): MediaStream {
    return this.aiMasterDest.stream;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.aiAccompanimentMasterBus.gain.setValueAtTime(muted ? 0.0 : 0.75, this.ctx.currentTime);
  }

  public updateLaneAudibility(leadAudible: boolean, bassAudible: boolean, drumsAudible: boolean) {
    const now = this.ctx.currentTime;
    this.leadSynthBus.gain.setValueAtTime(leadAudible ? 0.8 : 0.0001, now);
    this.basslineBus.gain.setValueAtTime(bassAudible ? 0.85 : 0.0001, now);
    this.drumsBus.gain.setValueAtTime(drumsAudible ? 0.8 : 0.0001, now);
  }

  public playSingleNote(trackType: string, pitch: number, velocity: number = 0.8, durationSec: number = 0.4) {
    const now = this.ctx.currentTime;
    if (trackType === 'drums') {
      this.triggerDrumHit(pitch, velocity, now);
    } else if (trackType === 'bass') {
      this.triggerSynthNote(pitch, velocity, now, Math.max(0.15, durationSec), this.aiAccompanimentMasterBus);
    } else {
      this.triggerSynthNote(pitch, velocity, now, Math.max(0.15, durationSec), this.aiAccompanimentMasterBus);
    }
  }

  public scheduleBarPlayback(
    drumsSeq: NoteSequencePayload | null,
    melodySeq: NoteSequencePayload | null,
    bassSeq: NoteSequencePayload | null,
    startAudioTime: number,
    bpm: number = 120
  ) {
    if (this.isMuted) return;

    const secondsPerStep = (60 / bpm) / 4; // 16 steps per bar

    // 1. Playback Drums Sequence -> Isolated Drums Bus
    if (drumsSeq && drumsSeq.notes) {
      drumsSeq.notes.forEach((note) => {
        const step = note.quantizedStartStep ?? 0;
        const noteStartTime = startAudioTime + step * secondsPerStep;
        if (noteStartTime >= this.ctx.currentTime - 0.05) {
          this.triggerDrumHit(note.pitch, note.velocity || 0.7, noteStartTime);
        }
      });
    }

    // 2. Playback Lead Synth Sequence -> Isolated Lead Synth Bus
    if (melodySeq && melodySeq.notes) {
      melodySeq.notes.forEach((note) => {
        const startStep = note.quantizedStartStep ?? 0;
        const endStep = note.quantizedEndStep ?? (startStep + 2);
        const durationSteps = Math.max(1, endStep - startStep);

        const noteStartTime = startAudioTime + startStep * secondsPerStep;
        const durationSec = durationSteps * secondsPerStep;

        if (noteStartTime >= this.ctx.currentTime - 0.05) {
          this.triggerSynthNote(note.pitch, note.velocity || 0.7, noteStartTime, durationSec, this.leadSynthBus);
        }
      });
    }

    // 3. Playback Bassline Sequence -> Isolated Bassline Bus
    if (bassSeq && bassSeq.notes) {
      bassSeq.notes.forEach((note) => {
        const startStep = note.quantizedStartStep ?? 0;
        const endStep = note.quantizedEndStep ?? (startStep + 2);
        const durationSteps = Math.max(1, endStep - startStep);

        const noteStartTime = startAudioTime + startStep * secondsPerStep;
        const durationSec = durationSteps * secondsPerStep;

        if (noteStartTime >= this.ctx.currentTime - 0.05) {
          this.triggerSynthNote(note.pitch, note.velocity || 0.85, noteStartTime, durationSec, this.basslineBus);
        }
      });
    }
  }

  private triggerDrumHit(pitch: number, velocity: number, time: number) {
    const t = Math.max(this.ctx.currentTime, time);

    // Kick Drum (MIDI 36 or 35)
    if (pitch === 36 || pitch === 35) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(38, t + 0.08);

      gain.gain.setValueAtTime(velocity * 0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.drumsBus);

      osc.start(t);
      osc.stop(t + 0.25);
    }
    // Snare Drum (MIDI 38 or 40)
    else if (pitch === 38 || pitch === 40) {
      const noiseBuffer = this.createNoiseBuffer(0.15);
      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 800;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(velocity * 0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      noiseSrc.connect(filter);
      filter.connect(gain);
      gain.connect(this.drumsBus);

      noiseSrc.start(t);
    }
    // Hi-Hats & Cymbals
    else {
      const noiseBuffer = this.createNoiseBuffer(0.05);
      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 7500;
      filter.Q.value = 3.0;

      const gain = this.ctx.createGain();
      const isOpen = pitch === 46;
      gain.gain.setValueAtTime(velocity * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (isOpen ? 0.15 : 0.04));

      noiseSrc.connect(filter);
      filter.connect(gain);
      gain.connect(this.drumsBus);

      noiseSrc.start(t);
    }
  }

  private triggerSynthNote(pitch: number, velocity: number, time: number, duration: number, outputBus: GainNode) {
    const t = Math.max(this.ctx.currentTime, time);
    const freq = 440 * Math.pow(2, (pitch - 69) / 12);

    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = pitch < 55 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq * 0.5, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(pitch < 55 ? 400 : 1200, t);
    filter.frequency.exponentialRampToValueAtTime(250, t + duration);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(velocity * 0.4, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(outputBus);

    osc.start(t);
    subOsc.start(t);
    osc.stop(t + duration + 0.05);
    subOsc.stop(t + duration + 0.05);
  }

  private createNoiseBuffer(durationSec: number): AudioBuffer {
    const length = Math.ceil(this.ctx.sampleRate * durationSec);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}

import { MIDINoteEvent, NoteSequencePayload } from './types';

/**
 * MIDISynthEngine
 *
 * Dedicated WebAudio MIDI synthesizer for Stage 2 AI Generation Mode.
 * Synthesizes generated drum hits (Kick, Snare, Hi-Hat) and bass/melody voices.
 * Cleanly separated from Stage 1 Stem Engine.
 */
export class MIDISynthEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private isMuted: boolean = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.75;
    this.masterGain.connect(this.ctx.destination);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.masterGain.gain.setValueAtTime(muted ? 0.0 : 0.75, this.ctx.currentTime);
  }

  public scheduleBarPlayback(
    drumsSeq: NoteSequencePayload | null,
    melodySeq: NoteSequencePayload | null,
    startAudioTime: number,
    bpm: number = 120
  ) {
    if (this.isMuted) return;

    const secondsPerStep = (60 / bpm) / 4; // 16 steps per bar (4 steps per quarter note)

    // 1. Playback Generated Drums Sequence
    if (drumsSeq && drumsSeq.notes) {
      drumsSeq.notes.forEach((note) => {
        const step = note.quantizedStartStep ?? 0;
        const noteStartTime = startAudioTime + step * secondsPerStep;
        if (noteStartTime >= this.ctx.currentTime - 0.05) {
          this.triggerDrumHit(note.pitch, note.velocity || 0.7, noteStartTime);
        }
      });
    }

    // 2. Playback Generated Melody / Bass Sequence
    if (melodySeq && melodySeq.notes) {
      melodySeq.notes.forEach((note) => {
        const startStep = note.quantizedStartStep ?? 0;
        const endStep = note.quantizedEndStep ?? (startStep + 2);
        const durationSteps = Math.max(1, endStep - startStep);

        const noteStartTime = startAudioTime + startStep * secondsPerStep;
        const durationSec = durationSteps * secondsPerStep;

        if (noteStartTime >= this.ctx.currentTime - 0.05) {
          this.triggerMelodyNote(note.pitch, note.velocity || 0.7, noteStartTime, durationSec);
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
      gain.connect(this.masterGain);

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
      gain.connect(this.masterGain);

      noiseSrc.start(t);
    }
    // Hi-Hats (MIDI 42, 44, 46)
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
      gain.connect(this.masterGain);

      noiseSrc.start(t);
    }
  }

  private triggerMelodyNote(pitch: number, velocity: number, time: number, duration: number) {
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
    gain.connect(this.masterGain);

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

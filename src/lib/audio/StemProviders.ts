import { IStemProvider, StemBuffers } from './types';

/**
 * SyntheticStemProvider
 *
 * Programmatically generates 3 tempo-locked, phase-aligned backing-track stems
 * using WebAudio OfflineAudioContext synthesis.
 * Guaranteed 100% offline, zero network dependencies, perfectly synced.
 */
export class SyntheticStemProvider implements IStemProvider {
  name = 'Synthetic (WebAudio Synthesis)';
  private defaultBpm: number;

  constructor(bpm = 120) {
    this.defaultBpm = bpm;
  }

  async loadStems(ctx: AudioContext, bpm?: number): Promise<StemBuffers> {
    const sampleRate = ctx.sampleRate;
    const targetBpm = bpm || this.defaultBpm || 120;
    const beatsPerBar = 4;
    const totalBars = 4;
    const secondsPerBeat = 60 / targetBpm;
    const durationSeconds = totalBars * beatsPerBar * secondsPerBeat;

    const [chill, groove, peak] = await Promise.all([
      this.renderStem(sampleRate, durationSeconds, targetBpm, 'chill'),
      this.renderStem(sampleRate, durationSeconds, targetBpm, 'groove'),
      this.renderStem(sampleRate, durationSeconds, targetBpm, 'peak'),
    ]);

    return { chill, groove, peak };
  }

  private async renderStem(
    sampleRate: number,
    durationSeconds: number,
    bpm: number,
    tier: 'chill' | 'groove' | 'peak'
  ): Promise<AudioBuffer> {
    const length = Math.ceil(sampleRate * durationSeconds);
    const offlineCtx = new OfflineAudioContext(2, length, sampleRate);
    const secondsPerBeat = 60 / bpm;
    const totalBeats = 16; // 4 bars * 4 beats

    // Master Gain for offline rendering
    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(offlineCtx.destination);

    // 1. Ambient Warm Pad (Chill, Groove, Peak)
    const padOsc1 = offlineCtx.createOscillator();
    const padOsc2 = offlineCtx.createOscillator();
    const padOsc3 = offlineCtx.createOscillator();
    const padGain = offlineCtx.createGain();

    padOsc1.type = 'sine';
    padOsc1.frequency.value = 130.81; // C3
    padOsc2.type = 'triangle';
    padOsc2.frequency.value = 196.0; // G3
    padOsc3.type = 'sine';
    padOsc3.frequency.value = 261.63; // C4

    padGain.gain.value = tier === 'chill' ? 0.35 : tier === 'groove' ? 0.25 : 0.2;

    padOsc1.connect(padGain);
    padOsc2.connect(padGain);
    padOsc3.connect(padGain);
    padGain.connect(masterGain);

    padOsc1.start(0);
    padOsc2.start(0);
    padOsc3.start(0);

    // 2. Bassline (Chill: Soft Beat 1 pulse, Groove: Rhythm, Peak: Driving 8th notes)
    if (tier === 'chill') {
      for (let bar = 0; bar < 4; bar++) {
        const beatTime = bar * 4 * secondsPerBeat;
        const bassOsc = offlineCtx.createOscillator();
        const bassGain = offlineCtx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.value = 65.41; // C2

        bassGain.gain.setValueAtTime(0, beatTime);
        bassGain.gain.linearRampToValueAtTime(0.4, beatTime + 0.05);
        bassGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 1.2);

        bassOsc.connect(bassGain);
        bassGain.connect(masterGain);

        bassOsc.start(beatTime);
        bassOsc.stop(beatTime + 1.3);
      }
    } else {
      // Groove & Peak Bassline
      for (let beat = 0; beat < totalBeats; beat++) {
        const beatTime = beat * secondsPerBeat;
        const isPulseBeat = tier === 'peak' ? beat % 1 === 0 : beat % 2 === 0;

        if (isPulseBeat) {
          const bassOsc = offlineCtx.createOscillator();
          const bassGain = offlineCtx.createGain();
          bassOsc.type = 'sawtooth';
          bassOsc.frequency.value = beat % 4 === 3 ? 58.27 : 65.41; // Bb1 or C2

          // Lowpass filter for smooth synth bass
          const filter = offlineCtx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = tier === 'peak' ? 450 : 280;

          bassGain.gain.setValueAtTime(0.5, beatTime);
          bassGain.gain.exponentialRampToValueAtTime(0.001, beatTime + secondsPerBeat * 0.8);

          bassOsc.connect(filter);
          filter.connect(bassGain);
          bassGain.connect(masterGain);

          bassOsc.start(beatTime);
          bassOsc.stop(beatTime + secondsPerBeat);
        }
      }
    }

    // 3. Drums / Percussion (Groove: Hat + Snare, Peak: Hat + Snare + Kick + Synth Lead Arp)
    if (tier === 'groove' || tier === 'peak') {
      for (let beat = 0; beat < totalBeats; beat++) {
        const beatTime = beat * secondsPerBeat;

        // Kick Drum on 1 and 3
        if (beat % 2 === 0) {
          const kickOsc = offlineCtx.createOscillator();
          const kickGain = offlineCtx.createGain();

          kickOsc.frequency.setValueAtTime(130, beatTime);
          kickOsc.frequency.exponentialRampToValueAtTime(35, beatTime + 0.08);

          kickGain.gain.setValueAtTime(0.6, beatTime);
          kickGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.25);

          kickOsc.connect(kickGain);
          kickGain.connect(masterGain);

          kickOsc.start(beatTime);
          kickOsc.stop(beatTime + 0.3);
        }

        // Snare on 2 and 4
        if (beat % 2 === 1) {
          const noiseBuffer = offlineCtx.createBuffer(1, sampleRate * 0.15, sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < output.length; i++) {
            output[i] = Math.random() * 2 - 1;
          }

          const noiseSrc = offlineCtx.createBufferSource();
          noiseSrc.buffer = noiseBuffer;

          const snareFilter = offlineCtx.createBiquadFilter();
          snareFilter.type = 'highpass';
          snareFilter.frequency.value = 1000;

          const snareGain = offlineCtx.createGain();
          snareGain.gain.setValueAtTime(tier === 'peak' ? 0.45 : 0.3, beatTime);
          snareGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.14);

          noiseSrc.connect(snareFilter);
          snareFilter.connect(snareGain);
          snareGain.connect(masterGain);

          noiseSrc.start(beatTime);
        }

        // Hi-Hats (8th notes for Groove, 16th notes for Peak)
        const hatSteps = tier === 'peak' ? 4 : 2;
        const stepDuration = secondsPerBeat / hatSteps;

        for (let sub = 0; sub < hatSteps; sub++) {
          const hatTime = beatTime + sub * stepDuration;
          const hatBuffer = offlineCtx.createBuffer(1, sampleRate * 0.04, sampleRate);
          const output = hatBuffer.getChannelData(0);
          for (let i = 0; i < output.length; i++) {
            output[i] = Math.random() * 2 - 1;
          }

          const hatSrc = offlineCtx.createBufferSource();
          hatSrc.buffer = hatBuffer;

          const hatFilter = offlineCtx.createBiquadFilter();
          hatFilter.type = 'highpass';
          hatFilter.frequency.value = 6000;

          const hatGain = offlineCtx.createGain();
          const isAccent = sub === 0;
          hatGain.gain.setValueAtTime(isAccent ? 0.2 : 0.1, hatTime);
          hatGain.gain.exponentialRampToValueAtTime(0.001, hatTime + 0.03);

          hatSrc.connect(hatFilter);
          hatFilter.connect(hatGain);
          hatGain.connect(masterGain);

          hatSrc.start(hatTime);
        }
      }
    }

    // 4. Arpeggiated Synth Lead (Peak Tier Only)
    if (tier === 'peak') {
      const arpNotes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const total16ths = totalBeats * 4;
      const step16th = secondsPerBeat / 4;

      for (let i = 0; i < total16ths; i++) {
        const stepTime = i * step16th;
        const freq = arpNotes[i % arpNotes.length];

        const leadOsc = offlineCtx.createOscillator();
        const leadGain = offlineCtx.createGain();

        leadOsc.type = 'sawtooth';
        leadOsc.frequency.value = freq;

        const leadFilter = offlineCtx.createBiquadFilter();
        leadFilter.type = 'lowpass';
        leadFilter.frequency.value = 2200;

        leadGain.gain.setValueAtTime(0.18, stepTime);
        leadGain.gain.exponentialRampToValueAtTime(0.001, stepTime + step16th * 0.9);

        leadOsc.connect(leadFilter);
        leadFilter.connect(leadGain);
        leadGain.connect(masterGain);

        leadOsc.start(stepTime);
        leadOsc.stop(stepTime + step16th);
      }
    }

    return await offlineCtx.startRendering();
  }
}

/**
 * FileStemProvider
 *
 * Loads custom audio files from public directory (/audio/chill.mp3, groove.mp3, peak.mp3).
 * Falls back to SyntheticStemProvider if files are unavailable.
 */
export class FileStemProvider implements IStemProvider {
  name = 'Custom Audio Files (/public/audio/)';

  async loadStems(ctx: AudioContext): Promise<StemBuffers> {
    const urls = {
      chill: '/audio/chill.mp3',
      groove: '/audio/groove.mp3',
      peak: '/audio/peak.mp3',
    };

    try {
      const [chill, groove, peak] = await Promise.all([
        this.fetchAndDecode(ctx, urls.chill),
        this.fetchAndDecode(ctx, urls.groove),
        this.fetchAndDecode(ctx, urls.peak),
      ]);

      return { chill, groove, peak };
    } catch (err) {
      console.warn('FileStemProvider failed to load audio files. Falling back to SyntheticStemProvider.', err);
      const fallback = new SyntheticStemProvider();
      return fallback.loadStems(ctx);
    }
  }

  private async fetchAndDecode(ctx: AudioContext, url: string): Promise<AudioBuffer> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch stem audio at ${url}: ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  }
}

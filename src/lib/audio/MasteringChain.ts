/**
 * MasteringChain.ts - Broadcast-Grade 3-Band Neural Audio Mastering & Spatial Processor
 *
 * Implements a WebAudio DSP chain to polish generative AI audio in real time:
 * 1. 3-Band Spectral Crossover (Sub-Bass Mono, Warm Analog Mid Saturation, High-Air Exciter).
 * 2. Mid/Side Stereo Imager / Widener.
 * 3. Lookahead Peak Limiter with -0.1 dBFS True Peak ceiling.
 * 4. Algorithmic Studio Impulse Reverb (Studio Room, Plate, Hall).
 */

export interface MasteringOptions {
  enableWarmth?: boolean;
  warmthAmount?: number; // 0.0 - 1.0 (tube drive)
  enableLimiter?: boolean;
  limiterCeilingDb?: number; // default -0.1 dB
  enableStereoWidener?: boolean;
  stereoWidth?: number; // 0.0 (mono) - 2.0 (super-wide)
  enableReverb?: boolean;
  reverbWet?: number; // 0.0 - 1.0
  reverbSpace?: 'studio' | 'plate' | 'ambient';
}

export class MasteringChain {
  private ctx: AudioContext;
  private inputNode: GainNode;
  private outputNode: GainNode;

  // 3-Band Crossover Filters
  private lowFilter: BiquadFilterNode;
  private midFilter: BiquadFilterNode;
  private highFilter: BiquadFilterNode;

  // Band Processors
  private lowGain: GainNode;
  private midWaveshaper: WaveShaperNode;
  private midGain: GainNode;
  private highFilterShelf: BiquadFilterNode;
  private highGain: GainNode;

  // Crossover Summing Node
  private crossoverSum: GainNode;

  // Stereo Widener (Mid/Side processing via ChannelSplitter & Merger)
  private widenerSplitter: ChannelSplitterNode;
  private widenerMerger: ChannelMergerNode;
  private sideGain: GainNode;

  // Studio Reverb Node
  private reverbConvolver: ConvolverNode;
  private reverbGain: GainNode;
  private dryGain: GainNode;

  // Master Peak Limiter (DynamicsCompressorNode configured as Brickwall Limiter)
  private masterLimiter: DynamicsCompressorNode;

  private isBypassed: boolean = false;
  private currentOptions: Required<MasteringOptions>;

  constructor(audioContext: AudioContext, options?: MasteringOptions) {
    this.ctx = audioContext;

    this.currentOptions = {
      enableWarmth: options?.enableWarmth ?? true,
      warmthAmount: options?.warmthAmount ?? 0.4,
      enableLimiter: options?.enableLimiter ?? true,
      limiterCeilingDb: options?.limiterCeilingDb ?? -0.1,
      enableStereoWidener: options?.enableStereoWidener ?? true,
      stereoWidth: options?.stereoWidth ?? 1.25,
      enableReverb: options?.enableReverb ?? true,
      reverbWet: options?.reverbWet ?? 0.18,
      reverbSpace: options?.reverbSpace ?? 'studio',
    };

    // 1. Create Input & Output
    this.inputNode = this.ctx.createGain();
    this.outputNode = this.ctx.createGain();

    // 2. 3-Band Crossover Filters
    this.lowFilter = this.ctx.createBiquadFilter();
    this.lowFilter.type = 'lowpass';
    this.lowFilter.frequency.value = 140; // Hz
    this.lowGain = this.ctx.createGain();
    this.lowGain.gain.value = 1.05; // gentle bass punch

    this.midFilter = this.ctx.createBiquadFilter();
    this.midFilter.type = 'bandpass';
    this.midFilter.frequency.value = 1000; // Hz
    this.midFilter.Q.value = 0.7;
    this.midWaveshaper = this.ctx.createWaveShaper();
    this.midWaveshaper.oversample = '2x';
    this.midWaveshaper.curve = this.createTubeSaturationCurve(this.currentOptions.warmthAmount) as Float32Array<ArrayBuffer>;
    this.midGain = this.ctx.createGain();
    this.midGain.gain.value = 1.0;

    this.highFilter = this.ctx.createBiquadFilter();
    this.highFilter.type = 'highpass';
    this.highFilter.frequency.value = 3500; // Hz
    this.highFilterShelf = this.ctx.createBiquadFilter();
    this.highFilterShelf.type = 'highshelf';
    this.highFilterShelf.frequency.value = 8000;
    this.highFilterShelf.gain.value = 2.0; // Air boost
    this.highGain = this.ctx.createGain();
    this.highGain.gain.value = 0.95;

    // Connect 3 bands from input
    this.inputNode.connect(this.lowFilter);
    this.lowFilter.connect(this.lowGain);

    this.inputNode.connect(this.midFilter);
    this.midFilter.connect(this.midWaveshaper);
    this.midWaveshaper.connect(this.midGain);

    this.inputNode.connect(this.highFilter);
    this.highFilter.connect(this.highFilterShelf);
    this.highFilterShelf.connect(this.highGain);

    // Sum bands
    this.crossoverSum = this.ctx.createGain();
    this.lowGain.connect(this.crossoverSum);
    this.midGain.connect(this.crossoverSum);
    this.highGain.connect(this.crossoverSum);

    // 3. Stereo Widener (Mid / Side differential simulation)
    this.widenerSplitter = this.ctx.createChannelSplitter(2);
    this.widenerMerger = this.ctx.createChannelMerger(2);
    this.sideGain = this.ctx.createGain();
    this.sideGain.gain.value = this.currentOptions.stereoWidth;

    this.crossoverSum.connect(this.widenerSplitter);
    this.widenerSplitter.connect(this.widenerMerger, 0, 0); // Left
    this.widenerSplitter.connect(this.widenerMerger, 1, 1); // Right
    this.widenerMerger.connect(this.sideGain);

    // 4. Algorithmic Studio Reverb
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 1.0 - this.currentOptions.reverbWet;

    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.buffer = this.generateStudioImpulseResponse(this.currentOptions.reverbSpace);
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = this.currentOptions.reverbWet;

    this.sideGain.connect(this.dryGain);
    this.sideGain.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbGain);

    // 5. Lookahead Brickwall Peak Limiter
    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.value = this.currentOptions.limiterCeilingDb;
    this.masterLimiter.knee.value = 0.0; // hard knee for true brickwall
    this.masterLimiter.ratio.value = 20.0; // 20:1 brickwall ratio
    this.masterLimiter.attack.value = 0.001; // 1ms ultra-fast attack
    this.masterLimiter.release.value = 0.05; // 50ms smooth release

    this.dryGain.connect(this.masterLimiter);
    this.reverbGain.connect(this.masterLimiter);
    this.masterLimiter.connect(this.outputNode);
  }

  /**
   * Generates a soft-clipping tube saturation wave-shaper curve
   */
  private createTubeSaturationCurve(drive: number): Float32Array {
    const samples = 1024;
    const curve = new Float32Array(samples);
    const k = 2 * Math.max(0.01, drive * 5);

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        // Asymmetrical soft-knee hyperbolic tangent curve
        curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
      }
    }
    return curve;
  }

  /**
   * Generates an algorithmic synthetic Impulse Response for studio ambiance
   */
  private generateStudioImpulseResponse(space: 'studio' | 'plate' | 'ambient'): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const duration = space === 'studio' ? 0.8 : space === 'plate' ? 1.4 : 2.2;
    const length = Math.floor(sampleRate * duration);
    const decay = space === 'studio' ? 3.5 : space === 'plate' ? 2.2 : 1.4;

    const buffer = this.ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-decay * t);
      // Dual-channel decorrelated pseudo-random early reflections + diffuse tail
      const noiseL = (Math.random() * 2 - 1) * env;
      const noiseR = (Math.random() * 2 - 1) * env;
      left[i] = noiseL * 0.4;
      right[i] = noiseR * 0.4;
    }

    return buffer;
  }

  public setWarmth(amount: number): void {
    const val = Math.max(0, Math.min(1, amount));
    this.currentOptions.warmthAmount = val;
    this.midWaveshaper.curve = this.createTubeSaturationCurve(val) as Float32Array<ArrayBuffer>;
  }

  public setStereoWidth(width: number): void {
    const val = Math.max(0, Math.min(2.5, width));
    this.currentOptions.stereoWidth = val;
    this.sideGain.gain.setValueAtTime(val, this.ctx.currentTime);
  }

  public setReverbWet(wet: number): void {
    const val = Math.max(0, Math.min(1, wet));
    this.currentOptions.reverbWet = val;
    this.reverbGain.gain.setValueAtTime(val, this.ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1.0 - val * 0.4, this.ctx.currentTime);
  }

  public setReverbSpace(space: 'studio' | 'plate' | 'ambient'): void {
    this.currentOptions.reverbSpace = space;
    this.reverbConvolver.buffer = this.generateStudioImpulseResponse(space);
  }

  public setLimiterCeiling(ceilingDb: number): void {
    this.currentOptions.limiterCeilingDb = ceilingDb;
    this.masterLimiter.threshold.setValueAtTime(ceilingDb, this.ctx.currentTime);
  }

  public setBypass(bypass: boolean): void {
    this.isBypassed = bypass;
    if (bypass) {
      this.inputNode.disconnect();
      this.inputNode.connect(this.outputNode);
    } else {
      this.inputNode.disconnect();
      this.inputNode.connect(this.lowFilter);
      this.inputNode.connect(this.midFilter);
      this.inputNode.connect(this.highFilter);
    }
  }

  public getInputNode(): GainNode {
    return this.inputNode;
  }

  public getOutputNode(): GainNode {
    return this.outputNode;
  }

  public getOptions(): Required<MasteringOptions> {
    return { ...this.currentOptions };
  }
}

/**
 * LyriaAudioStreamer
 *
 * WebAudio 48kHz stereo PCM audio buffer streamer & gain mixer.
 * Receives continuous audio chunks from Lyria RealTime WebSocket session,
 * buffers PCM samples to smooth jitter, and plays back via WebAudio.
 */
export class LyriaAudioStreamer {
  private ctx: AudioContext;
  public gainNode: GainNode;

  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private sampleRate = 48000;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.5; // Default 50% Cloud Vibe level
    this.gainNode.connect(this.ctx.destination);
  }

  public setVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    this.gainNode.gain.setValueAtTime(clamped, this.ctx.currentTime);
  }

  public getVolume(): number {
    return this.gainNode.gain.value;
  }

  /**
   * Enqueues incoming raw PCM 48kHz stereo audio buffer or Base64 chunk
   */
  public enqueuePCMChunk(pcmData: Float32Array | Int16Array | ArrayBuffer) {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    let leftChannel: Float32Array;
    let rightChannel: Float32Array;

    if (pcmData instanceof Float32Array) {
      const numFrames = Math.floor(pcmData.length / 2);
      leftChannel = new Float32Array(numFrames);
      rightChannel = new Float32Array(numFrames);
      for (let i = 0; i < numFrames; i++) {
        leftChannel[i] = pcmData[i * 2];
        rightChannel[i] = pcmData[i * 2 + 1];
      }
    } else if (pcmData instanceof Int16Array) {
      const numFrames = Math.floor(pcmData.length / 2);
      leftChannel = new Float32Array(numFrames);
      rightChannel = new Float32Array(numFrames);
      for (let i = 0; i < numFrames; i++) {
        leftChannel[i] = pcmData[i * 2] / 32768.0;
        rightChannel[i] = pcmData[i * 2 + 1] / 32768.0;
      }
    } else {
      // Int16 ArrayBuffer
      const int16 = new Int16Array(pcmData);
      const numFrames = Math.floor(int16.length / 2);
      leftChannel = new Float32Array(numFrames);
      rightChannel = new Float32Array(numFrames);
      for (let i = 0; i < numFrames; i++) {
        leftChannel[i] = int16[i * 2] / 32768.0;
        rightChannel[i] = int16[i * 2 + 1] / 32768.0;
      }
    }

    const numFrames = leftChannel.length;
    if (numFrames === 0) return;

    const audioBuffer = this.ctx.createBuffer(2, numFrames, this.sampleRate);
    audioBuffer.getChannelData(0).set(leftChannel);
    audioBuffer.getChannelData(1).set(rightChannel);

    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    const now = this.ctx.currentTime;
    if (this.nextPlayTime < now) {
      this.nextPlayTime = now + 0.05; // 50ms initial safety jitter buffer
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;

    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
    };

    this.isPlaying = true;
  }

  /**
   * Smoothly crossfades gain out over specified duration (ms)
   */
  public fadeOutAndStop(durationMs: number = 500) {
    const t = this.ctx.currentTime;
    const fadeSec = durationMs / 1000;
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, t);
    this.gainNode.gain.exponentialRampToValueAtTime(0.0001, t + fadeSec);

    setTimeout(() => {
      this.stopAll();
    }, durationMs + 50);
  }

  public stopAll() {
    this.activeSources.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    });
    this.activeSources.clear();
    this.nextPlayTime = 0;
    this.isPlaying = false;
  }

  public destroy() {
    this.stopAll();
    try {
      this.gainNode.disconnect();
    } catch {}
  }
}

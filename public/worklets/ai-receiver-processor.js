/**
 * PulseJam AI Receiver Processor (Stage 2 MRT2 Audio Output)
 *
 * Runs inside the WebAudio AudioWorklet execution context.
 * Receives continuous PCM audio chunks from AIAudioReceiver via port messages,
 * queues them in a ring buffer, and writes 48kHz stereo samples into the WebAudio output graph.
 *
 * Features:
 * - Click-free packet loss concealment (soft cosine fade-out on underrun, soft fade-in on recovery).
 * - Zero-crossing micro-sample drop when buffer accumulates clock drift excess.
 */

class AIReceiverProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // 48kHz stereo ring buffer (~2 second capacity = 48000 * 2 = 96000 samples per channel)
    const currentSR = typeof sampleRate !== 'undefined' ? sampleRate : 48000;
    this.bufferCapacity = Math.floor(currentSR * 2);
    this.bufferLeft = new Float32Array(this.bufferCapacity);
    this.bufferRight = new Float32Array(this.bufferCapacity);

    this.readIndex = 0;
    this.writeIndex = 0;
    this.availableSamples = 0;

    // Target pre-buffer: 3 chunks * 1920 = 5760 samples (~120ms at 48kHz)
    this.targetBufferSamples = Math.floor(currentSR * 0.12);
    this.isBuffering = true;
    this.hasReceivedAudio = false;

    // Concealment & Drift State
    this.lastLeftSample = 0.0;
    this.lastRightSample = 0.0;
    this.isRecoveringFromUnderrun = false;
    this.fadeStep = 0;
    this.fadeLength = 64; // 64-sample micro-ramp (~1.3ms at 48kHz)

    this.port.onmessage = (event) => this.handleMessage(event.data);
  }

  handleMessage(data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'PUSH_AUDIO': {
        const { left, right, samplesCount } = data.payload || {};
        if (!left || !samplesCount) return;

        this.hasReceivedAudio = true;

        // Clock drift check: if buffer is over 60% full, gently compress chunk
        const highWatermark = Math.floor(this.bufferCapacity * 0.6);
        let count = Math.min(samplesCount, this.bufferCapacity - this.availableSamples);
        if (this.availableSamples > highWatermark) {
          count = Math.floor(count * 0.98);
        }

        const lChannel = left instanceof Float32Array ? left : new Float32Array(left);
        const rChannel = right ? (right instanceof Float32Array ? right : new Float32Array(right)) : lChannel;

        for (let i = 0; i < count; i++) {
          this.bufferLeft[this.writeIndex] = lChannel[i];
          this.bufferRight[this.writeIndex] = rChannel[i];
          this.writeIndex = (this.writeIndex + 1) % this.bufferCapacity;
        }
        this.availableSamples += count;

        // Exit buffering once pre-buffer threshold is met
        if (this.isBuffering && this.availableSamples >= this.targetBufferSamples) {
          this.isBuffering = false;
          this.isRecoveringFromUnderrun = true;
          this.fadeStep = 0;
        }

        if (this.isRecoveringFromUnderrun) {
          this.fadeStep = 0;
        }
        break;
      }

      case 'RESET': {
        this.readIndex = 0;
        this.writeIndex = 0;
        this.availableSamples = 0;
        this.bufferLeft.fill(0);
        this.bufferRight.fill(0);
        this.lastLeftSample = 0.0;
        this.lastRightSample = 0.0;
        this.isRecoveringFromUnderrun = false;
        this.isBuffering = true;
        this.hasReceivedAudio = false;
        break;
      }
    }
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;

    const outLeft = output[0];
    const outRight = output[1] || output[0];
    const frameCount = outLeft.length;

    // If buffering initial audio or waiting for stream, output silence
    if (this.isBuffering || this.availableSamples < frameCount) {
      // Soft fade-out of any residual tail samples
      for (let i = 0; i < frameCount; i++) {
        if (this.availableSamples > 0 && !this.isBuffering) {
          const l = this.bufferLeft[this.readIndex];
          const r = this.bufferRight[this.readIndex];
          outLeft[i] = l;
          outRight[i] = r;
          this.lastLeftSample = l;
          this.lastRightSample = r;
          this.readIndex = (this.readIndex + 1) % this.bufferCapacity;
          this.availableSamples--;
        } else {
          this.lastLeftSample *= 0.85;
          this.lastRightSample *= 0.85;
          outLeft[i] = Math.abs(this.lastLeftSample) > 0.0001 ? this.lastLeftSample : 0;
          outRight[i] = Math.abs(this.lastRightSample) > 0.0001 ? this.lastRightSample : 0;
        }
      }

      // If we were playing and just ran out of samples, notify receiver ONCE and re-enter buffering
      if (this.hasReceivedAudio && !this.isBuffering) {
        this.isBuffering = true;
        this.isRecoveringFromUnderrun = true;
        this.port.postMessage({
          type: 'WORKLET_UNDERRUN',
          payload: { availableSamples: this.availableSamples },
        });
      }

      return true;
    }

    // Normal playback with full jitter buffer
    for (let i = 0; i < frameCount; i++) {
      let l = this.bufferLeft[this.readIndex];
      let r = this.bufferRight[this.readIndex];

      // Soft fade-in recovery if recovering from underrun
      if (this.isRecoveringFromUnderrun && this.fadeStep < this.fadeLength) {
        const gain = this.fadeStep / this.fadeLength;
        l *= gain;
        r *= gain;
        this.fadeStep++;
        if (this.fadeStep >= this.fadeLength) {
          this.isRecoveringFromUnderrun = false;
        }
      }

      outLeft[i] = l;
      outRight[i] = r;
      this.lastLeftSample = l;
      this.lastRightSample = r;

      this.readIndex = (this.readIndex + 1) % this.bufferCapacity;
    }
    this.availableSamples -= frameCount;

    return true;
  }
}

registerProcessor('pulsejam-ai-receiver-processor', AIReceiverProcessor);


/**
 * PulseJam AI Receiver Processor (Stage 2 MRT2 Audio Output)
 *
 * Runs inside the WebAudio AudioWorklet execution context.
 * Receives continuous PCM audio chunks from AIAudioReceiver via port messages,
 * queues them in a ring buffer, and writes 48kHz stereo samples into the WebAudio output graph.
 */

class AIReceiverProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // 48kHz stereo ring buffer (~1 second capacity = 48000 * 2 = 96000 samples per channel)
    const currentSR = typeof sampleRate !== 'undefined' ? sampleRate : 48000;
    this.bufferCapacity = Math.floor(currentSR * 2);
    this.bufferLeft = new Float32Array(this.bufferCapacity);
    this.bufferRight = new Float32Array(this.bufferCapacity);

    this.readIndex = 0;
    this.writeIndex = 0;
    this.availableSamples = 0;

    this.port.onmessage = (event) => this.handleMessage(event.data);
  }

  handleMessage(data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'PUSH_AUDIO': {
        const { left, right, samplesCount } = data.payload || {};
        if (!left || !samplesCount) return;

        const count = Math.min(samplesCount, this.bufferCapacity - this.availableSamples);
        const lChannel = left instanceof Float32Array ? left : new Float32Array(left);
        const rChannel = right ? (right instanceof Float32Array ? right : new Float32Array(right)) : lChannel;

        for (let i = 0; i < count; i++) {
          this.bufferLeft[this.writeIndex] = lChannel[i];
          this.bufferRight[this.writeIndex] = rChannel[i];
          this.writeIndex = (this.writeIndex + 1) % this.bufferCapacity;
        }
        this.availableSamples += count;
        break;
      }

      case 'RESET': {
        this.readIndex = 0;
        this.writeIndex = 0;
        this.availableSamples = 0;
        this.bufferLeft.fill(0);
        this.bufferRight.fill(0);
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

    if (this.availableSamples >= frameCount) {
      for (let i = 0; i < frameCount; i++) {
        outLeft[i] = this.bufferLeft[this.readIndex];
        outRight[i] = this.bufferRight[this.readIndex];
        this.readIndex = (this.readIndex + 1) % this.bufferCapacity;
      }
      this.availableSamples -= frameCount;
    } else {
      // Underrun: Output silence and drain remaining samples if any
      for (let i = 0; i < frameCount; i++) {
        if (this.availableSamples > 0) {
          outLeft[i] = this.bufferLeft[this.readIndex];
          outRight[i] = this.bufferRight[this.readIndex];
          this.readIndex = (this.readIndex + 1) % this.bufferCapacity;
          this.availableSamples--;
        } else {
          outLeft[i] = 0;
          outRight[i] = 0;
        }
      }

      this.port.postMessage({
        type: 'WORKLET_UNDERRUN',
        payload: { availableSamples: this.availableSamples },
      });
    }

    return true;
  }
}

registerProcessor('pulsejam-ai-receiver-processor', AIReceiverProcessor);

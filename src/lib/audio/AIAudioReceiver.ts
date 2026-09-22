import {
  AIAudioStreamMetrics,
  AIAudioStreamState,
  BINARY_MAGIC,
  BINARY_HEADER_SIZE,
  BinaryMessageType,
} from './types';

export interface ChunkPayload {
  pcmData: Float32Array | Float32Array[] | ArrayBuffer;
  sequenceNumber: number;
  timestamp?: number;
}

export interface AIAudioReceiverOptions {
  sampleRate?: number;
  chunkDurationMs?: number;
  targetBufferChunks?: number;
  maxBufferChunks?: number;
}

export interface ParsedPCMChunk {
  left: Float32Array;
  right: Float32Array;
  samplesPerChannel: number;
  sequenceNumber: number;
  timestamp: number;
}

export type MetricsCallback = (metrics: AIAudioStreamMetrics) => void;

export class AIAudioReceiver {
  private sampleRate: number;
  private chunkDurationMs: number;
  private targetBufferChunks: number;
  private maxBufferChunks: number;

  // Jitter Buffer & Queue
  private chunkQueue: ParsedPCMChunk[] = [];
  private expectedSequenceNumber: number | null = null;
  private lastChunkTimestamp = 0;
  private underrunCount = 0;
  private currentState: AIAudioStreamState = 'idle';
  private isBinaryStream = false;
  private idleTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

  // WebAudio Integration
  private ctx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;

  // Subscribers
  private metricsListeners: Set<MetricsCallback> = new Set();

  constructor(options: AIAudioReceiverOptions = {}) {
    this.sampleRate = options.sampleRate || 48000;
    this.chunkDurationMs = options.chunkDurationMs || 40;
    this.targetBufferChunks = options.targetBufferChunks || 3;
    this.maxBufferChunks = options.maxBufferChunks || 50;
  }

  /**
   * Dedicated zero-copy binary frame ingestion.
   * Parses 16-byte header [Magic: 2B (0x504A) | MsgType: 2B | Seq: 4B | Timestamp: 8B]
   * followed by interleaved Float32 PCM payload.
   */
  public pushBinaryChunk(buffer: ArrayBuffer): boolean {
    if (!buffer || buffer.byteLength < BINARY_HEADER_SIZE) {
      return false;
    }

    const dataView = new DataView(buffer);
    const magic = dataView.getUint16(0, false); // big-endian
    if (magic !== BINARY_MAGIC) {
      // Fallback: treat as raw Float32 array without header
      const seq = this.expectedSequenceNumber ?? 0;
      this.pushChunk(buffer, seq);
      return true;
    }

    const msgType = dataView.getUint16(2, false);
    if (msgType !== BinaryMessageType.AUDIO_CHUNK) {
      return false; // Not an audio chunk frame (e.g. pong/auth handled separately)
    }

    const seq = dataView.getUint32(4, false);
    const tsHigh = dataView.getUint32(8, false);
    const tsLow = dataView.getUint32(12, false);
    const timestamp = tsHigh * 4294967296 + tsLow;

    this.isBinaryStream = true;

    // Zero-copy Float32 view of the PCM payload
    const pcmBytes = buffer.byteLength - BINARY_HEADER_SIZE;
    const floatCount = Math.floor(pcmBytes / 4);
    const floatView = new Float32Array(buffer, BINARY_HEADER_SIZE, floatCount);

    this.pushChunk(floatView, seq, timestamp);
    return true;
  }

  /**
   * Generic chunk-feeding interface. Accepts 40ms PCM audio chunks.
   */
  public pushChunk(
    pcmData: Float32Array | Float32Array[] | ArrayBuffer,
    sequenceNumber: number,
    timestamp?: number
  ): void {
    const now = timestamp ?? Date.now();
    this.lastChunkTimestamp = now;

    if (this.idleTimeoutTimer) {
      clearTimeout(this.idleTimeoutTimer);
      this.idleTimeoutTimer = null;
    }

    // If given ArrayBuffer, check if it contains the binary magic header
    if (pcmData instanceof ArrayBuffer && pcmData.byteLength >= BINARY_HEADER_SIZE) {
      const dv = new DataView(pcmData);
      if (dv.getUint16(0, false) === BINARY_MAGIC) {
        this.pushBinaryChunk(pcmData);
        return;
      }
    }

    // Parse incoming PCM audio into standardized left & right Float32Arrays
    const parsed = this.parsePCMData(pcmData, sequenceNumber, now);

    // Detect Stream Restart (e.g. sequence numbers reset to 0 or dropped backwards by a large delta)
    if (
      this.expectedSequenceNumber !== null &&
      (sequenceNumber < this.expectedSequenceNumber - 5 ||
        (sequenceNumber === 0 && this.expectedSequenceNumber > 5))
    ) {
      this.resetInternalBuffer();
    }

    // Detect Missing Chunks (sequence number gap)
    if (this.expectedSequenceNumber !== null) {
      if (sequenceNumber > this.expectedSequenceNumber) {
        const missingCount = sequenceNumber - this.expectedSequenceNumber;
        this.underrunCount += missingCount;
      }
    }

    this.expectedSequenceNumber = sequenceNumber + 1;

    // Enforce Max Jitter Buffer Capacity
    if (this.chunkQueue.length >= this.maxBufferChunks) {
      this.chunkQueue.shift(); // Drop oldest chunk to prevent unbounded buffer growth
    }

    // Push into Jitter Buffer
    this.chunkQueue.push(parsed);

    // State Machine Transitions
    if (this.currentState === 'idle') {
      this.currentState = 'buffering';
    }

    if (this.currentState === 'buffering' || this.currentState === 'stalled') {
      if (this.chunkQueue.length >= this.targetBufferChunks) {
        this.currentState = 'streaming';
      }
    }

    // Forward chunk to WebAudio AudioWorkletNode if connected
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: 'PUSH_AUDIO',
        payload: {
          left: parsed.left,
          right: parsed.right,
          samplesCount: parsed.samplesPerChannel,
          sequenceNumber: parsed.sequenceNumber,
        },
      });
    }

    this.scheduleIdleTransition();
    this.notifyMetrics();
  }

  /**
   * Consumes (pops) a single 40ms chunk from the jitter buffer queue for playback.
   * Returns null if queue is empty (triggering underrun/stalled state).
   */
  public consumeChunk(): ParsedPCMChunk | null {
    if (this.chunkQueue.length === 0) {
      if (this.currentState === 'streaming') {
        this.currentState = 'stalled';
        this.underrunCount++;
        this.notifyMetrics();
      }
      return null;
    }

    const chunk = this.chunkQueue.shift()!;
    this.notifyMetrics();
    return chunk;
  }

  /**
   * Simulates processing audio samples/time ticks (used in test harnesses or offline simulation).
   */
  public tick(elapsedMs: number): void {
    if (this.currentState !== 'streaming') return;

    const chunksToConsume = Math.floor(elapsedMs / this.chunkDurationMs);
    for (let i = 0; i < chunksToConsume; i++) {
      this.consumeChunk();
    }
  }

  /**
   * Resets receiver state cleanly (for stream stops, restarts, or explicit resets).
   */
  public reset(): void {
    if (this.idleTimeoutTimer) {
      clearTimeout(this.idleTimeoutTimer);
      this.idleTimeoutTimer = null;
    }
    this.resetInternalBuffer();
    this.underrunCount = 0;
    this.currentState = 'idle';
    this.isBinaryStream = false;
    this.notifyMetrics();
  }

  private resetInternalBuffer(): void {
    this.chunkQueue = [];
    this.expectedSequenceNumber = null;
    this.currentState = 'idle';
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'RESET' });
    }
  }

  private scheduleIdleTransition(): void {
    if (this.idleTimeoutTimer) {
      clearTimeout(this.idleTimeoutTimer);
    }
    this.idleTimeoutTimer = setTimeout(() => {
      if (this.currentState === 'stalled' || (this.currentState === 'streaming' && this.chunkQueue.length === 0)) {
        this.currentState = 'idle';
        this.notifyMetrics();
      }
    }, 600);
  }

  /**
   * Initializes WebAudio AudioWorklet integration.
   */
  public async initializeAudioWorklet(ctx: AudioContext): Promise<AudioWorkletNode | null> {
    this.ctx = ctx;
    if (!ctx || !ctx.audioWorklet) return null;

    try {
      await ctx.audioWorklet.addModule('/worklets/ai-receiver-processor.js');
      this.workletNode = new AudioWorkletNode(ctx, 'pulsejam-ai-receiver-processor');

      this.workletNode.port.onmessage = (event) => {
        if (event.data?.type === 'WORKLET_UNDERRUN') {
          const now = Date.now();
          // If chunks have ceased for more than 500ms, stream has ended / is in standby
          if (now - this.lastChunkTimestamp > 500) {
            if (this.currentState !== 'idle') {
              this.currentState = 'idle';
              this.notifyMetrics();
            }
          } else if (this.currentState === 'streaming') {
            this.currentState = 'stalled';
            this.underrunCount++;
            this.notifyMetrics();
          }
        }
      };

      return this.workletNode;
    } catch (err) {
      console.warn('AIAudioReceiver: AudioWorklet initialization failed:', err);
      return null;
    }
  }

  public getWorkletNode(): AudioWorkletNode | null {
    return this.workletNode;
  }

  public getMetrics(): AIAudioStreamMetrics {
    const bufferDepthChunks = this.chunkQueue.length;
    const bufferDepthMs = bufferDepthChunks * this.chunkDurationMs;

    return {
      state: this.currentState,
      bufferDepthMs,
      bufferDepthChunks,
      underrunCount: this.underrunCount,
      lastChunkTimestamp: this.lastChunkTimestamp,
      isBinaryStream: this.isBinaryStream,
    };
  }

  public subscribeMetrics(cb: MetricsCallback): () => void {
    this.metricsListeners.add(cb);
    cb(this.getMetrics());
    return () => this.metricsListeners.delete(cb);
  }

  private notifyMetrics(): void {
    const metrics = this.getMetrics();
    this.metricsListeners.forEach((cb) => cb(metrics));
  }

  /**
   * Normalizes input PCM data formats into discrete left/right Float32Array channels.
   */
  private parsePCMData(
    pcmData: Float32Array | Float32Array[] | ArrayBuffer,
    sequenceNumber: number,
    timestamp: number
  ): ParsedPCMChunk {
    let left: Float32Array;
    let right: Float32Array;
    let samplesPerChannel = 1920;

    if (Array.isArray(pcmData)) {
      left = pcmData[0];
      right = pcmData[1] || pcmData[0];
      samplesPerChannel = left.length;
    } else if (pcmData instanceof ArrayBuffer) {
      const floatView = new Float32Array(pcmData);
      if (floatView.length >= 3840) {
        // Interleaved stereo 3840 floats -> 1920 L / 1920 R
        samplesPerChannel = Math.floor(floatView.length / 2);
        left = new Float32Array(samplesPerChannel);
        right = new Float32Array(samplesPerChannel);
        for (let i = 0; i < samplesPerChannel; i++) {
          left[i] = floatView[i * 2];
          right[i] = floatView[i * 2 + 1];
        }
      } else {
        samplesPerChannel = floatView.length;
        left = floatView;
        right = floatView;
      }
    } else {
      // Single Float32Array
      if (pcmData.length >= 3840) {
        samplesPerChannel = Math.floor(pcmData.length / 2);
        left = new Float32Array(samplesPerChannel);
        right = new Float32Array(samplesPerChannel);
        for (let i = 0; i < samplesPerChannel; i++) {
          left[i] = pcmData[i * 2];
          right[i] = pcmData[i * 2 + 1];
        }
      } else {
        samplesPerChannel = pcmData.length;
        left = pcmData;
        right = pcmData;
      }
    }

    return {
      left,
      right,
      samplesPerChannel,
      sequenceNumber,
      timestamp,
    };
  }
}


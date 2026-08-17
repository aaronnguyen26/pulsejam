import { describe, it, expect, beforeEach } from 'vitest';
import { AIAudioReceiver } from '../AIAudioReceiver';
import { ConditioningBridge } from '../ConditioningBridge';
import { BINARY_MAGIC, BinaryMessageType } from '../types';

/**
 * Creates a raw binary WebSocket packet matching the 16-byte header format:
 * [Magic: 2B (0x504A) | MsgType: 2B (0x0001) | Seq: 4B uint32 | Timestamp: 8B uint64] + Float32 PCM payload
 */
function createSyntheticBinaryFrame(seq: number, timestamp = Date.now(), samplesPerChannel = 1920): ArrayBuffer {
  const headerSize = 16;
  const pcmBytes = samplesPerChannel * 2 * 4; // 1920 samples * 2 channels * 4 bytes/float = 15,360 bytes
  const buffer = new ArrayBuffer(headerSize + pcmBytes);
  const dv = new DataView(buffer);

  // 1. Magic
  dv.setUint16(0, BINARY_MAGIC, false);
  // 2. MsgType
  dv.setUint16(2, BinaryMessageType.AUDIO_CHUNK, false);
  // 3. Sequence Number
  dv.setUint32(4, seq, false);
  // 4. Timestamp (64-bit split)
  const tsHigh = Math.floor(timestamp / 4294967296);
  const tsLow = timestamp >>> 0;
  dv.setUint32(8, tsHigh, false);
  dv.setUint32(12, tsLow, false);

  // 5. Interleaved Float32 stereo sine wave
  const floatView = new Float32Array(buffer, headerSize, samplesPerChannel * 2);
  for (let i = 0; i < samplesPerChannel; i++) {
    const val = Math.sin((i / 48000) * 2 * Math.PI * 440) * 0.4;
    floatView[i * 2] = val;     // Left
    floatView[i * 2 + 1] = val; // Right
  }

  return buffer;
}

describe('Phase 1: Binary WebSocket Protocol & Jitter Buffer Engine', () => {
  let receiver: AIAudioReceiver;

  beforeEach(() => {
    receiver = new AIAudioReceiver({
      sampleRate: 48000,
      chunkDurationMs: 40,
      targetBufferChunks: 3,
      maxBufferChunks: 50,
    });
  });

  it('correctly unpacks 16-byte binary header and sets isBinaryStream flag', () => {
    const binaryFrame = createSyntheticBinaryFrame(0, 1723850000000);
    const success = receiver.pushBinaryChunk(binaryFrame);

    expect(success).toBe(true);
    const metrics = receiver.getMetrics();
    expect(metrics.isBinaryStream).toBe(true);
    expect(metrics.bufferDepthChunks).toBe(1);
    expect(metrics.bufferDepthMs).toBe(40);
    expect(metrics.lastChunkTimestamp).toBe(1723850000000);
  });

  it('maintains steady streaming state when continuous binary frames arrive', () => {
    // Push 3 frames to reach streaming threshold
    for (let i = 0; i < 3; i++) {
      receiver.pushBinaryChunk(createSyntheticBinaryFrame(i));
    }

    const metrics = receiver.getMetrics();
    expect(metrics.state).toBe('streaming');
    expect(metrics.bufferDepthChunks).toBe(3);
    expect(metrics.underrunCount).toBe(0);

    // Consume chunk 0
    const c0 = receiver.consumeChunk();
    expect(c0).not.toBeNull();
    expect(c0?.sequenceNumber).toBe(0);
    expect(c0?.samplesPerChannel).toBe(1920);
    expect(c0?.left.length).toBe(1920);
    expect(c0?.right.length).toBe(1920);

    // Push frame 3 and consume chunk 1
    receiver.pushBinaryChunk(createSyntheticBinaryFrame(3));
    const c1 = receiver.consumeChunk();
    expect(c1?.sequenceNumber).toBe(1);

    expect(receiver.getMetrics().underrunCount).toBe(0);
    expect(receiver.getMetrics().state).toBe('streaming');
  });

  it('detects sequence gaps in binary stream and increments underrun count', () => {
    receiver.pushBinaryChunk(createSyntheticBinaryFrame(0));
    receiver.pushBinaryChunk(createSyntheticBinaryFrame(1));
    // Gap: sequence 2 and 3 dropped by network jitter
    receiver.pushBinaryChunk(createSyntheticBinaryFrame(4));

    const metrics = receiver.getMetrics();
    expect(metrics.underrunCount).toBe(2); // Missed seq 2 and 3
    expect(metrics.bufferDepthChunks).toBe(3);
  });

  it('resets cleanly when stream sequence restarts from zero', () => {
    for (let i = 0; i < 10; i++) {
      receiver.pushBinaryChunk(createSyntheticBinaryFrame(i));
    }
    expect(receiver.getMetrics().bufferDepthChunks).toBe(10);

    // Stream restarts back at sequence 0
    receiver.pushBinaryChunk(createSyntheticBinaryFrame(0));
    expect(receiver.getMetrics().bufferDepthChunks).toBe(1);
    expect(receiver.getMetrics().state).toBe('buffering');
  });

  it('supports ConditioningBridge token configuration and receiver attachment', () => {
    const bridge = new ConditioningBridge({
      wsUrl: 'ws://127.0.0.1:9090',
      authToken: 'secret-ephemeral-uuid-1234',
      debugMode: true,
    });

    bridge.attachAIAudioReceiver(receiver);
    expect(bridge.getAIAudioReceiver()).toBe(receiver);

    bridge.setAuthToken('new-token-5678');
    bridge.updateMetrics({
      rawRmsDb: -20,
      smoothedRmsDb: -22,
      rawOnsetDensity: 2,
      smoothedOnsetDensity: 2,
      activeTier: 'groove',
      candidateTier: 'groove',
      mode: 'LIVE',
      calibration: { quietDb: -38, normalDb: -22, loudDb: -12, onsetThreshold: 3.5 },
      timestamp: 100,
      currentPitch: 60,
      pitchConfidence: 0.9,
    });

    bridge.stop();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { AIAudioReceiver } from '../AIAudioReceiver';

/**
 * Helper to generate synthetic 40ms MRT2 PCM audio chunks
 * (float32, 48kHz, stereo, 1920 samples/channel = 3840 interleaved floats)
 */
function createSyntheticChunk(seq: number, freq = 440): Float32Array {
  const samplesPerChannel = 1920;
  const chunk = new Float32Array(samplesPerChannel * 2);
  const sampleRate = 48000;

  for (let i = 0; i < samplesPerChannel; i++) {
    const t = (seq * samplesPerChannel + i) / sampleRate;
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.5;
    chunk[i * 2] = sample;     // Left channel
    chunk[i * 2 + 1] = sample; // Right channel
  }
  return chunk;
}

describe('AIAudioReceiver Phase 1 Isolated Milestone', () => {
  let receiver: AIAudioReceiver;

  beforeEach(() => {
    receiver = new AIAudioReceiver({
      sampleRate: 48000,
      chunkDurationMs: 40,
      targetBufferChunks: 3, // 120ms target jitter buffer
      maxBufferChunks: 50,
    });
  });

  it('Normal Case: steady 40ms cadence produces continuous, gapless playback', () => {
    let metrics = receiver.getMetrics();
    expect(metrics.state).toBe('idle');
    expect(metrics.bufferDepthChunks).toBe(0);
    expect(metrics.underrunCount).toBe(0);

    // Push chunk 0
    receiver.pushChunk(createSyntheticChunk(0), 0);
    metrics = receiver.getMetrics();
    expect(metrics.state).toBe('buffering');
    expect(metrics.bufferDepthChunks).toBe(1);

    // Push chunk 1
    receiver.pushChunk(createSyntheticChunk(1), 1);
    expect(receiver.getMetrics().bufferDepthChunks).toBe(2);

    // Push chunk 2 (reaches target jitter buffer threshold of 3 chunks = 120ms)
    receiver.pushChunk(createSyntheticChunk(2), 2);
    metrics = receiver.getMetrics();
    expect(metrics.state).toBe('streaming');
    expect(metrics.bufferDepthChunks).toBe(3);
    expect(metrics.bufferDepthMs).toBe(120);

    // Simulate steady 40ms consumption loop
    const c0 = receiver.consumeChunk();
    expect(c0).not.toBeNull();
    expect(c0?.sequenceNumber).toBe(0);
    expect(c0?.samplesPerChannel).toBe(1920);

    // Feed next chunk on cadence
    receiver.pushChunk(createSyntheticChunk(3), 3);

    const c1 = receiver.consumeChunk();
    expect(c1?.sequenceNumber).toBe(1);

    const c2 = receiver.consumeChunk();
    expect(c2?.sequenceNumber).toBe(2);

    metrics = receiver.getMetrics();
    expect(metrics.underrunCount).toBe(0);
    expect(metrics.state).toBe('streaming');
  });

  it('Early Chunks: bursty chunk arrivals are absorbed by jitter buffer without dropping audio', () => {
    // Push 8 chunks rapidly in a burst
    for (let i = 0; i < 8; i++) {
      receiver.pushChunk(createSyntheticChunk(i), i);
    }

    const metrics = receiver.getMetrics();
    expect(metrics.state).toBe('streaming');
    expect(metrics.bufferDepthChunks).toBe(8);
    expect(metrics.bufferDepthMs).toBe(320);
    expect(metrics.underrunCount).toBe(0);

    // Verify all 8 chunks can be consumed in exact order
    for (let i = 0; i < 8; i++) {
      const chunk = receiver.consumeChunk();
      expect(chunk?.sequenceNumber).toBe(i);
    }
  });

  it('Late Chunks: delayed arrivals trigger tracked underrun and graceful stall state', () => {
    // Fill buffer to reach streaming state
    for (let i = 0; i < 3; i++) {
      receiver.pushChunk(createSyntheticChunk(i), i);
    }
    expect(receiver.getMetrics().state).toBe('streaming');

    // Drain buffer completely
    receiver.consumeChunk();
    receiver.consumeChunk();
    receiver.consumeChunk();

    // Consume when queue is empty (simulating late arrival gap)
    const emptyChunk = receiver.consumeChunk();
    expect(emptyChunk).toBeNull();

    const metrics = receiver.getMetrics();
    expect(metrics.state).toBe('stalled');
    expect(metrics.underrunCount).toBe(1);

    // Push new late chunk -> buffer refills and recovers
    receiver.pushChunk(createSyntheticChunk(3), 3);
    receiver.pushChunk(createSyntheticChunk(4), 4);
    receiver.pushChunk(createSyntheticChunk(5), 5);

    const recoveredMetrics = receiver.getMetrics();
    expect(recoveredMetrics.state).toBe('streaming');
    expect(recoveredMetrics.bufferDepthChunks).toBe(3);
  });

  it('Missing Chunks: detects sequence number gaps, increments underrun count, and preserves alignment', () => {
    // Push chunks 0, 1, 2
    receiver.pushChunk(createSyntheticChunk(0), 0);
    receiver.pushChunk(createSyntheticChunk(1), 1);
    receiver.pushChunk(createSyntheticChunk(2), 2);
    expect(receiver.getMetrics().underrunCount).toBe(0);

    // Push chunk 5 (simulating missing sequence numbers 3 and 4)
    receiver.pushChunk(createSyntheticChunk(5), 5);

    const metrics = receiver.getMetrics();
    expect(metrics.underrunCount).toBe(2); // 2 dropped chunks detected

    // Consume next chunk from queue
    const chunk = receiver.consumeChunk();
    expect(chunk?.sequenceNumber).toBe(0);

    // Consume remaining
    receiver.consumeChunk(); // 1
    receiver.consumeChunk(); // 2
    const skippedChunk = receiver.consumeChunk(); // 5
    expect(skippedChunk?.sequenceNumber).toBe(5);
  });

  it('Stream Restart: sequence number resets reset state cleanly and resume playback', () => {
    // Stream active with chunks 0..5
    for (let i = 0; i <= 5; i++) {
      receiver.pushChunk(createSyntheticChunk(i), i);
    }
    expect(receiver.getMetrics().bufferDepthChunks).toBe(6);

    // Stream stops and restarts: chunk 0 arrives while expected sequence was 6
    receiver.pushChunk(createSyntheticChunk(0), 0);

    let metrics = receiver.getMetrics();
    expect(metrics.bufferDepthChunks).toBe(1); // Old buffer cleared, single chunk queued
    expect(metrics.state).toBe('buffering');

    // Feed new stream chunks 1 and 2
    receiver.pushChunk(createSyntheticChunk(1), 1);
    receiver.pushChunk(createSyntheticChunk(2), 2);

    metrics = receiver.getMetrics();
    expect(metrics.state).toBe('streaming');
    expect(metrics.bufferDepthChunks).toBe(3);

    // Explicit reset method test
    receiver.reset();
    metrics = receiver.getMetrics();
    expect(metrics.state).toBe('idle');
    expect(metrics.bufferDepthChunks).toBe(0);
    expect(metrics.underrunCount).toBe(0);
  });

  it('Stability: idle queues do not generate spurious underruns or thrash state', async () => {
    // 1. Initial idle state
    expect(receiver.getMetrics().state).toBe('idle');
    expect(receiver.consumeChunk()).toBeNull();
    // Consuming while already idle must NOT trigger stalled or increment underruns
    expect(receiver.getMetrics().state).toBe('idle');
    expect(receiver.getMetrics().underrunCount).toBe(0);

    // 2. Push 3 chunks -> transitions to streaming
    receiver.pushChunk(createSyntheticChunk(0), 0);
    receiver.pushChunk(createSyntheticChunk(1), 1);
    receiver.pushChunk(createSyntheticChunk(2), 2);
    expect(receiver.getMetrics().state).toBe('streaming');

    // 3. Consume all 3 chunks
    expect(receiver.consumeChunk()?.sequenceNumber).toBe(0);
    expect(receiver.consumeChunk()?.sequenceNumber).toBe(1);
    expect(receiver.consumeChunk()?.sequenceNumber).toBe(2);

    // 4. Next consume on empty queue triggers stalled once
    expect(receiver.consumeChunk()).toBeNull();
    expect(receiver.getMetrics().state).toBe('stalled');
    expect(receiver.getMetrics().underrunCount).toBe(1);

    // Repeated consume while already stalled should not keep incrementing underruns
    expect(receiver.consumeChunk()).toBeNull();
    expect(receiver.getMetrics().underrunCount).toBe(1);

    // 5. Explicit reset or timeout returns cleanly to idle
    receiver.reset();
    expect(receiver.getMetrics().state).toBe('idle');
    expect(receiver.getMetrics().underrunCount).toBe(0);
  });
});

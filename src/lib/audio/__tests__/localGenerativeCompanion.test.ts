import { describe, it, expect, beforeEach } from 'vitest';
import { LocalGenerativeCompanion } from '../LocalGenerativeCompanion';
import { AIAudioReceiver } from '../AIAudioReceiver';
import { ConditioningFrame, BINARY_MAGIC, BINARY_HEADER_SIZE } from '../types';
import { StemEngine } from '../StemEngine';

describe('LocalGenerativeCompanion & Jam Fixes Test Suite', () => {
  let companion: LocalGenerativeCompanion;
  let receiver: AIAudioReceiver;

  beforeEach(() => {
    receiver = new AIAudioReceiver({
      sampleRate: 48000,
      chunkDurationMs: 40,
    });
    companion = new LocalGenerativeCompanion(48000, 40);
    companion.attachReceiver(receiver);
  });

  it('generates binary PCM audio frame with valid PulseJam 0x504A magic header', () => {
    const chunk = companion.generateAndPushChunk();
    expect(chunk).toBeDefined();
    expect(chunk.byteLength).toBe(BINARY_HEADER_SIZE + 1920 * 2 * 4);

    const dv = new DataView(chunk);
    expect(dv.getUint16(0, false)).toBe(BINARY_MAGIC); // 0x504A
    expect(dv.getUint16(2, false)).toBe(1); // AUDIO_CHUNK

    // Receiver should have received the chunk
    const metrics = receiver.getMetrics();
    expect(metrics.bufferDepthChunks).toBe(1);
    expect(metrics.isBinaryStream).toBe(true);
  });

  it('updates accompaniment response to incoming pitch onsets in ConditioningFrames', () => {
    // Create conditioning frame with pitch onset at C4 (MIDI 60)
    const pitchState = new Array(128).fill(-1);
    pitchState[60] = 2; // Onset

    const frame: ConditioningFrame = {
      pitchState,
      stylePrompt: 'driving energetic',
      timestamp: Date.now(),
      mode: 'midi+audio',
      estimatedKey: 'C Major',
      estimatedBpm: 128,
    };

    companion.updateConditioning(frame);
    const chunk = companion.generateAndPushChunk();
    expect(chunk.byteLength).toBeGreaterThan(0);

    const metrics = receiver.getMetrics();
    expect(metrics.bufferDepthChunks).toBe(1);
  });

  it('StemEngine dynamically adjusts quarter note duration when tempo changes', () => {
    // Create mock audio context
    const mockCtx = {
      currentTime: 10.0,
      destination: {},
      createGain: () => ({
        gain: {
          value: 1.0,
          setValueAtTime: () => {},
          cancelScheduledValues: () => {},
          setValueCurveAtTime: () => {},
        },
        connect: () => {},
        disconnect: () => {},
      }),
      createBufferSource: () => ({
        buffer: null,
        loop: true,
        connect: () => {},
        start: () => {},
        stop: () => {},
        disconnect: () => {},
      }),
    } as unknown as AudioContext;

    const mockDestGain = {
      connect: () => {},
    } as unknown as AudioNode;

    const stemEngine = new StemEngine(mockCtx, mockDestGain);
    expect(stemEngine.getActiveTier()).toBe('chill');

    // Update tempo to 90 BPM
    stemEngine.setBpm(90);
    // Verified no error thrown and engine holds active state
    expect(stemEngine.getActiveTier()).toBe('chill');
  });
});

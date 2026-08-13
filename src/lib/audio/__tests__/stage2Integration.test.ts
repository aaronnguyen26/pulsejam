import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioEngine } from '../AudioEngine';
import { ConditioningBridge } from '../ConditioningBridge';
import { AIAudioReceiver } from '../AIAudioReceiver';

// Mock WebAudio AudioContext & GainNode for testing node environment
class MockAudioParam {
  public value: number;
  constructor(defaultValue: number) {
    this.value = defaultValue;
  }
  setValueAtTime(v: number) {
    this.value = v;
  }
  linearRampToValueAtTime(v: number) {
    this.value = v;
  }
  exponentialRampToValueAtTime(v: number) {
    this.value = v;
  }
}


class MockGainNode {
  public gain: MockAudioParam;
  constructor(defaultGain = 1.0) {
    this.gain = new MockAudioParam(defaultGain);
  }
  connect() {}
  disconnect() {}
}

class MockAudioContext {
  public currentTime = 0;
  public state = 'running';
  public audioWorklet = {
    addModule: async () => Promise.resolve(),
  };
  createGain() {
    return new MockGainNode();
  }
  createBiquadFilter() {
    return {
      type: 'highpass',
      frequency: new MockAudioParam(80),
      connect: () => {},
      disconnect: () => {},
    };
  }
  createDynamicsCompressor() {
    return {
      threshold: new MockAudioParam(-6),
      knee: new MockAudioParam(0),
      ratio: new MockAudioParam(20),
      attack: new MockAudioParam(0.003),
      release: new MockAudioParam(0.1),
      connect: () => {},
      disconnect: () => {},
    };
  }

  createMediaStreamSource() {
    return {
      connect: () => {},
      disconnect: () => {},
    };
  }
  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: () => new Float32Array(length),
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
    };
  }
  createOscillator() {
    return {
      type: 'sine',
      frequency: new MockAudioParam(440),
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
    };
  }
  close() {
    this.state = 'closed';
  }
}



class MockOfflineAudioContext extends MockAudioContext {
  async startRendering() {
    return {
      numberOfChannels: 2,
      length: 48000,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(48000),
    };
  }
}

describe('Stage 2 Integration Test Suite', () => {
  beforeEach(() => {
    (globalThis as any).AudioContext = MockAudioContext;
    (globalThis as any).OfflineAudioContext = MockOfflineAudioContext;
    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    };


    (globalThis as any).AudioWorkletNode = class MockAudioWorkletNode {
      public port = {
        onmessage: null as any,
        postMessage: () => {},
      };
      connect() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Mixer Gain Staging: AudioEngine controls Mic, AI Audio Stream, and Master gain independently', async () => {
    const engine = new AudioEngine();
    await engine.initialize('synthetic');



    // Default gains (micMixGain defaults to 0.0 to prevent feedback)
    expect(engine.getMicMixGain()).toBe(0.0);
    expect(engine.getAIAudioMixGain()).toBe(1.0);
    expect(engine.getMasterGain()).toBe(1.0);


    // Test independent gain staging updates
    engine.setMicMixGain(0.75);
    expect(engine.getMicMixGain()).toBe(0.75);
    expect(engine.getAIAudioMixGain()).toBe(1.0);

    engine.setAIAudioMixGain(0.5);
    expect(engine.getAIAudioMixGain()).toBe(0.5);
    expect(engine.getMicMixGain()).toBe(0.75);

    engine.setMasterGain(1.2);
    expect(engine.getMasterGain()).toBe(1.2);

    engine.destroy();
  });

  it('WebSocket-to-AIAudioReceiver Wiring: ConditioningBridge routes incoming audio chunks to AIAudioReceiver', () => {
    const bridge = new ConditioningBridge({ wsUrl: 'ws://localhost:9090', debugMode: true });
    const receiver = new AIAudioReceiver();
    const pushChunkSpy = vi.spyOn(receiver, 'pushChunk');

    bridge.setAIAudioReceiver(receiver);
    expect(bridge.getAIAudioReceiver()).toBe(receiver);

    // Mock WebSocket class
    let createdSocket: any = null;
    class MockWebSocket {
      public readyState = 1;
      public onopen: any = null;
      public onmessage: any = null;
      public onerror: any = null;
      public onclose: any = null;
      send() {}
      close() {}
      constructor() {
        createdSocket = this;
      }
    }

    (globalThis as any).WebSocket = MockWebSocket;

    bridge.connect();

    // Trigger onopen if set
    if (createdSocket?.onopen) {
      createdSocket.onopen();
    }

    // Send JSON AUDIO_CHUNK message
    const pcmSamples = new Float32Array(3840);
    const jsonMessage = {
      data: JSON.stringify({
        type: 'AUDIO_CHUNK',
        pcmData: Array.from(pcmSamples),
        sequenceNumber: 42,
        timestamp: 1000,
      }),
    };

    if (createdSocket?.onmessage) {
      createdSocket.onmessage(jsonMessage);
    }

    expect(pushChunkSpy).toHaveBeenCalledWith(expect.any(Array), 42, 1000);

    // Send binary ArrayBuffer message
    const binaryBuffer = pcmSamples.buffer;
    if (createdSocket?.onmessage) {
      createdSocket.onmessage({ data: binaryBuffer });
    }

    expect(pushChunkSpy).toHaveBeenCalledWith(binaryBuffer, expect.any(Number));

    bridge.stop();
  });

  it('Unreachable Sidecar Connection: handles offline sidecar gracefully without crash', () => {
    const bridge = new ConditioningBridge({ wsUrl: 'ws://localhost:9999', debugMode: true });
    let lastState = '';
    bridge.subscribeSidecarStatus((status) => {
      lastState = status.state;
    });

    class ThrowingWebSocket {
      constructor() {
        throw new Error('Connection failed');
      }
    }

    (globalThis as any).WebSocket = ThrowingWebSocket;

    // Should handle exception gracefully without crashing
    expect(() => bridge.connect()).not.toThrow();
    expect(lastState).toBe('unavailable');

    bridge.stop();
  });
});


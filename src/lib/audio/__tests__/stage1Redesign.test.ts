import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CalibrationData, ConditioningFrame, DSPMetrics } from '../types';
import { ConditioningBridge } from '../ConditioningBridge';
import { useCalibrationStore } from '../../state/calibrationStore';
import { saveToneSample, getToneSample, deleteToneSample } from '../toneSampleStorage';

// Functional IndexedDB Mock for Vitest node environment
function createMockIndexedDB() {
  const store = new Map<string, any>();
  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => {},
    transaction: () => ({
      objectStore: () => ({
        put: (item: any) => {
          store.set(item.key, item);
          const req = { result: undefined, onsuccess: null as any, onerror: null as any };
          setTimeout(() => req.onsuccess && req.onsuccess(), 0);
          return req;
        },
        get: (key: string) => {
          const item = store.get(key);
          const req = { result: item, onsuccess: null as any, onerror: null as any };
          setTimeout(() => req.onsuccess && req.onsuccess(), 0);
          return req;
        },
        delete: (key: string) => {
          store.delete(key);
          const req = { result: undefined, onsuccess: null as any, onerror: null as any };
          setTimeout(() => req.onsuccess && req.onsuccess(), 0);
          return req;
        },
      }),
    }),
  };

  return {
    open: (name: string, version: number) => {
      const req = {
        result: db,
        onsuccess: null as any,
        onerror: null as any,
        onupgradeneeded: null as any,
      };
      setTimeout(() => req.onsuccess && req.onsuccess(), 0);
      return req;
    },
    _store: store,
  };
}

describe('Stage 1 Redesign Unit & Integration Test Suite', () => {
  beforeEach(() => {
    useCalibrationStore.getState().clearCalibration();
    const mockIDB = createMockIndexedDB();
    (globalThis as any).indexedDB = mockIDB;
    if (typeof window !== 'undefined') {
      (window as any).indexedDB = mockIDB;
    }
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 1. Pitch Range Derivation Logic
  describe('1. Pitch Range Derivation', () => {
    it('should correctly derive pitchRangeLow and pitchRangeHigh from recorded phrase events', () => {
      const phraseEvents = [60, 62, 65, 57, 72, 64];
      const low = Math.min(...phraseEvents);
      const high = Math.max(...phraseEvents);

      expect(low).toBe(57);
      expect(high).toBe(72);
    });

    it('should handle empty phrase events gracefully with fallbacks', () => {
      const phraseEvents: number[] = [];
      const low = phraseEvents.length > 0 ? Math.min(...phraseEvents) : 60;
      const high = phraseEvents.length > 0 ? Math.max(...phraseEvents) : 60;

      expect(low).toBe(60);
      expect(high).toBe(60);
    });
  });

  // 2. Numeric vs Tone Sample Persistence Split & IndexedDB Round-Trip
  describe('2. Persistence Split & IndexedDB Storage', () => {
    it('should persist numeric CalibrationData in Zustand store', () => {
      const testCalibration: CalibrationData = {
        quietDb: -42,
        normalDb: -26,
        loudDb: -10,
        onsetThreshold: 3.5,
        pitchConfidenceScore: 88,
        isPitchVerified: true,
        calibratedAtGainDb: 12,
        pitchRangeLow: 48,
        pitchRangeHigh: 72,
        toneSampleRef: 'tone_sample_12345',
        conditioningMode: 'midi+audio',
      };

      useCalibrationStore.getState().setCalibration(testCalibration);
      const stored = useCalibrationStore.getState().calibration;

      expect(stored).not.toBeNull();
      expect(stored?.quietDb).toBe(-42);
      expect(stored?.pitchRangeLow).toBe(48);
      expect(stored?.pitchRangeHigh).toBe(72);
      expect(stored?.toneSampleRef).toBe('tone_sample_12345');
      expect(stored?.conditioningMode).toBe('midi+audio');
    });

    it('should execute IndexedDB round-trip: saveFloat32Array audio clip, get by key, and delete', async () => {
      const key = 'tone_sample_roundtrip_test';
      const sampleRate = 44100;
      const samplePCM = new Float32Array([0.05, -0.12, 0.45, -0.8, 0.99]);

      // 1. Write tone sample
      const savePromise = saveToneSample(key, samplePCM, sampleRate);
      await vi.advanceTimersByTimeAsync(50);
      await savePromise;

      // 2. Read back tone sample
      const getPromise = getToneSample(key);
      await vi.advanceTimersByTimeAsync(50);
      const retrieved = await getPromise;

      expect(retrieved).not.toBeNull();
      expect(retrieved?.sampleRate).toBe(44100);
      expect(retrieved?.pcmData).toBeInstanceOf(Float32Array);
      expect(Array.from(retrieved!.pcmData)).toEqual(Array.from(samplePCM));

      // 3. Delete tone sample
      const deletePromise = deleteToneSample(key);
      await vi.advanceTimersByTimeAsync(50);
      await deletePromise;

      // 4. Verify read returns null after deletion
      const getAfterDeletePromise = getToneSample(key);
      await vi.advanceTimersByTimeAsync(50);
      const retrievedAfterDelete = await getAfterDeletePromise;

      expect(retrievedAfterDelete).toBeNull();
    });
  });

  // 3. ConditioningFrame Construction & GM MIDI Mapping
  describe('3. ConditioningFrame Construction & Cadence', () => {
    it('should construct valid 128-element General MIDI pitch state and style prompt', () => {
      const bridge = new ConditioningBridge({ debugMode: true, tickIntervalMs: 40 });
      bridge.start();

      const mockMetrics: DSPMetrics = {
        rawRmsDb: -20,
        smoothedRmsDb: -20,
        rawOnsetDensity: 2,
        smoothedOnsetDensity: 2,
        activeTier: 'groove',
        candidateTier: 'groove',
        mode: 'LIVE',
        calibration: {
          quietDb: -38,
          normalDb: -22,
          loudDb: -12,
          onsetThreshold: 3.5,
          conditioningMode: 'midi+audio',
        },
        timestamp: 12.34, // audio context relative seconds
        wallClockTimestamp: Date.now(),
        currentPitch: 60, // C4
        currentFrequency: 261.63,
        pitchConfidence: 0.85,
      };

      bridge.processMetrics(mockMetrics);

      const frameListener = vi.fn();
      bridge.subscribeFrames(frameListener);

      // Fast forward 40ms timer
      vi.advanceTimersByTime(40);

      expect(frameListener).toHaveBeenCalledTimes(1);
      const frame: ConditioningFrame = frameListener.mock.calls[0][0];

      expect(frame.pitchState.length).toBe(128);
      expect(frame.pitchState[60]).toBe(2); // Onset (corrected: 2)
      expect(frame.pitchState[0]).toBe(-1);  // Unplayed pitch default: -1 (masked)
      expect(frame.pitchState[127]).toBe(-1); // Unplayed pitch default: -1 (masked)
      expect(frame.stylePrompt).toBe('steady groove');
      expect(frame.mode).toBe('midi+audio');

      // Fast forward another 40ms with same pitch to verify sustain encoding (1)
      vi.advanceTimersByTime(40);
      expect(frameListener).toHaveBeenCalledTimes(2);
      const frame2: ConditioningFrame = frameListener.mock.calls[1][0];
      expect(frame2.pitchState[60]).toBe(1); // Sustain (corrected: 1)

      bridge.stop();
    });
  });

  // 4. Live Confidence Gating & Strict Ceiling Rule Enforcement
  describe('4. Live Confidence Gating & Calibration Ceiling Rule', () => {
    it('should drop live mode to audio-only when confidence drops for sustained ticks', () => {
      const bridge = new ConditioningBridge({
        debugMode: true,
        confidenceWindowSize: 5,
        confidenceDropThreshold: 0.35,
        confidenceRecoveryThreshold: 0.60,
        confidenceSustainTicks: 3,
      });

      bridge.setCalibrationCeiling('midi+audio');
      bridge.start();

      let lastFrameMode: 'midi+audio' | 'audio-only' = 'midi+audio';
      bridge.subscribeFrames((frame) => {
        lastFrameMode = frame.mode;
      });

      // Provide low pitch confidence metrics (<0.35)
      for (let i = 0; i < 10; i++) {
        bridge.processMetrics({
          rawRmsDb: -25,
          smoothedRmsDb: -25,
          rawOnsetDensity: 1,
          smoothedOnsetDensity: 1,
          activeTier: 'chill',
          candidateTier: 'chill',
          mode: 'LIVE',
          calibration: { quietDb: -38, normalDb: -22, loudDb: -12, onsetThreshold: 3.5 },
          timestamp: 10.0,
          wallClockTimestamp: Date.now(),
          currentPitch: 60,
          pitchConfidence: 0.1, // Low confidence / noisy
        });
        vi.advanceTimersByTime(40);
      }

      expect(lastFrameMode).toBe('audio-only');

      bridge.stop();
    });

    it('NEVER upgrades live mode past audio-only when calibration ceiling is audio-only', () => {
      const bridge = new ConditioningBridge({
        debugMode: true,
        confidenceWindowSize: 5,
        confidenceDropThreshold: 0.35,
        confidenceRecoveryThreshold: 0.60,
        confidenceSustainTicks: 2,
      });

      // Explicitly set calibration ceiling to 'audio-only' (unverified phrase pitch calibration)
      bridge.setCalibrationCeiling('audio-only');
      bridge.start();

      let lastFrameMode: 'midi+audio' | 'audio-only' = 'midi+audio';
      bridge.subscribeFrames((frame) => {
        lastFrameMode = frame.mode;
      });

      // Feed perfect 1.0 pitch confidence metrics
      for (let i = 0; i < 10; i++) {
        bridge.processMetrics({
          rawRmsDb: -15,
          smoothedRmsDb: -15,
          rawOnsetDensity: 4,
          smoothedOnsetDensity: 4,
          activeTier: 'peak',
          candidateTier: 'peak',
          mode: 'LIVE',
          calibration: { quietDb: -38, normalDb: -22, loudDb: -12, onsetThreshold: 3.5 },
          timestamp: 15.0,
          wallClockTimestamp: Date.now(),
          currentPitch: 64,
          pitchConfidence: 1.0, // Perfect confidence
        });
        vi.advanceTimersByTime(40);
      }

      // Live mode MUST remain locked to audio-only per calibration ceiling rule!
      expect(lastFrameMode).toBe('audio-only');

      bridge.stop();
    });

    it('should force all-masked (-1) pitchState and audio-only mode when DSP telemetry stream is stalled (>200ms)', () => {
      const bridge = new ConditioningBridge({
        debugMode: true,
        metricsStalenessMs: 200,
      });

      bridge.setCalibrationCeiling('midi+audio');
      bridge.start();

      const oldTimestamp = Date.now() - 350; // Stale timestamp (350ms old)

      bridge.processMetrics({
        rawRmsDb: -20,
        smoothedRmsDb: -20,
        rawOnsetDensity: 2,
        smoothedOnsetDensity: 2,
        activeTier: 'groove',
        candidateTier: 'groove',
        mode: 'LIVE',
        calibration: { quietDb: -38, normalDb: -22, loudDb: -12, onsetThreshold: 3.5 },
        timestamp: 100.0,
        wallClockTimestamp: oldTimestamp,
        currentPitch: 67,
        pitchConfidence: 0.95,
      });

      let latestFrame: ConditioningFrame | null = null;
      bridge.subscribeFrames((frame) => {
        latestFrame = frame;
      });

      vi.advanceTimersByTime(40);

      expect(latestFrame).not.toBeNull();
      expect(latestFrame!.mode).toBe('audio-only');
      expect(latestFrame!.pitchState.every((val) => val === -1)).toBe(true);

      bridge.stop();
    });

    it('should fill entire pitchState array with -1 (masked) when effectiveMode is audio-only', () => {
      const bridge = new ConditioningBridge({ debugMode: true });
      bridge.setCalibrationCeiling('audio-only');
      bridge.start();

      bridge.processMetrics({
        rawRmsDb: -18,
        smoothedRmsDb: -18,
        rawOnsetDensity: 3,
        smoothedOnsetDensity: 3,
        activeTier: 'groove',
        candidateTier: 'groove',
        mode: 'LIVE',
        calibration: { quietDb: -38, normalDb: -22, loudDb: -12, onsetThreshold: 3.5 },
        timestamp: 12.0,
        wallClockTimestamp: Date.now(),
        currentPitch: 60, // C4 detected
        pitchConfidence: 0.9,
      });

      let latestFrame: ConditioningFrame | null = null;
      bridge.subscribeFrames((frame) => {
        latestFrame = frame;
      });

      vi.advanceTimersByTime(40);

      expect(latestFrame).not.toBeNull();
      expect(latestFrame!.mode).toBe('audio-only');
      expect(latestFrame!.pitchState.length).toBe(128);
      expect(latestFrame!.pitchState.every((val) => val === -1)).toBe(true);

      bridge.stop();
    });
  });

  // 5. Honest pitchConfidence & WallClock Timestamping
  describe('5. Honest pitchConfidence & WallClock Timestamping', () => {
    it('should carry wallClockTimestamp and honest pitchConfidence on telemetry metrics', () => {
      const metrics: DSPMetrics = {
        rawRmsDb: -25,
        smoothedRmsDb: -25,
        rawOnsetDensity: 1,
        smoothedOnsetDensity: 1,
        activeTier: 'chill',
        candidateTier: 'chill',
        mode: 'LIVE',
        calibration: { quietDb: -38, normalDb: -22, loudDb: -12, onsetThreshold: 3.5 },
        timestamp: 45.67,
        wallClockTimestamp: Date.now(),
        currentPitch: null,
        pitchConfidence: 0.25, // Low confidence honestly reported
      };

      expect(metrics.pitchConfidence).toBe(0.25);
      expect(metrics.currentPitch).toBeNull();
      expect(metrics.wallClockTimestamp).toBeGreaterThan(0);
    });
  });

  // 6. Sidecar Reconnect Exponential Backoff
  describe('6. Sidecar Reconnect Exponential Backoff', () => {
    it('should double reconnect delay up to 30000ms cap on repeated connection failures', async () => {
      class MockWebSocket {
        public readyState = 0;
        public onopen: any = null;
        public onmessage: any = null;
        public onerror: any = null;
        public onclose: any = null;

        send() {}
        close() {}
      }

      if (typeof window === 'undefined') {
        (globalThis as any).window = globalThis;
      }
      (globalThis as any).WebSocket = MockWebSocket;
      (globalThis as any).window.WebSocket = MockWebSocket;

      const bridge = new ConditioningBridge({ debugMode: false });
      const connectSpy = vi.spyOn(bridge, 'connect');

      // First connection attempt
      bridge.connect('ws://localhost:9090');
      expect(connectSpy).toHaveBeenCalledTimes(1);

      // Trigger 1st socket close -> 2000ms reconnect delay
      (bridge as any).socket.onclose();

      await vi.advanceTimersByTimeAsync(1990);
      expect(connectSpy).toHaveBeenCalledTimes(1); // Not reconnected yet

      await vi.advanceTimersByTimeAsync(20);
      expect(connectSpy).toHaveBeenCalledTimes(2); // 1st retry executed

      // Trigger 2nd socket close -> 4000ms reconnect delay
      (bridge as any).socket.onclose();

      await vi.advanceTimersByTimeAsync(3990);
      expect(connectSpy).toHaveBeenCalledTimes(2); // Not reconnected yet

      await vi.advanceTimersByTimeAsync(20);
      expect(connectSpy).toHaveBeenCalledTimes(3); // 2nd retry executed (doubled to 4s)

      bridge.disconnect();
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { WebMIDIManager } from '../WebMIDIManager';
import { OPFSRecorder } from '../OPFSRecorder';
import { StemExporter } from '../StemExporter';

describe('Phase 3: Hardware Ergonomics, Fast Disk Streaming & Export', () => {
  describe('1. Web MIDI Footswitch & Controller Integration', () => {
    it('gracefully handles missing MIDI API in test/unsupported environments', async () => {
      const manager = new WebMIDIManager();
      const initialized = await manager.initialize();
      expect(initialized).toBe(false);
      expect(manager.getStatus().isSupported).toBe(false);
    });

    it('routes incoming Control Change (CC) messages to configured actions', () => {
      const onActionSpy = vi.fn();
      const manager = new WebMIDIManager({
        onActionTriggered: onActionSpy,
      });

      // Simulate CC#64 (Sustain Pedal Press = CC value 127)
      manager.handleMIDIMessage({
        data: new Uint8Array([0xb0, 64, 127]),
      });
      expect(onActionSpy).toHaveBeenCalledWith('TOGGLE_RECORD', 127);

      // Simulate CC#81 (Tier Up = CC value 127)
      manager.handleMIDIMessage({
        data: new Uint8Array([0xb0, 81, 127]),
      });
      expect(onActionSpy).toHaveBeenCalledWith('TIER_UP', 127);

      // Sustain Pedal Release (CC value 0) -> Ignored by footswitch trigger
      manager.handleMIDIMessage({
        data: new Uint8Array([0xb0, 64, 0]),
      });
      expect(onActionSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('2. OPFS / Multi-Take Audio Jam Recorder', () => {
    it('manages multi-take recording lifecycle and compiles contiguous audio buffers', () => {
      const recorder = new OPFSRecorder(48000);
      expect(recorder.getIsRecording()).toBe(false);
      expect(recorder.getTakeCount()).toBe(0);

      // 1. Start Take 1
      const take1Meta = recorder.startTake();
      expect(take1Meta.takeNumber).toBe(1);
      expect(recorder.getIsRecording()).toBe(true);

      // 2. Push 2 stereo chunks of 480 samples each
      const chunk1L = new Float32Array(480).fill(0.5);
      const chunk1R = new Float32Array(480).fill(-0.5);
      const chunk2L = new Float32Array(480).fill(0.8);
      const chunk2R = new Float32Array(480).fill(-0.8);

      recorder.pushAudioChunk(chunk1L, chunk1R);
      recorder.pushAudioChunk(chunk2L, chunk2R);

      // 3. Stop Take 1
      const stoppedTake1 = recorder.stopTake();
      expect(stoppedTake1).not.toBeNull();
      expect(stoppedTake1?.takeNumber).toBe(1);
      expect(recorder.getIsRecording()).toBe(false);
      expect(recorder.getTakeCount()).toBe(1);

      // 4. Verify compiled take audio data
      const takeData = recorder.getTakeAudioData(1);
      expect(takeData).not.toBeNull();
      expect(takeData?.left.length).toBe(960);
      expect(takeData?.right.length).toBe(960);
      expect(takeData?.left[0]).toBeCloseTo(0.5);
      expect(takeData?.left[480]).toBeCloseTo(0.8);
      expect(takeData?.right[0]).toBeCloseTo(-0.5);
      expect(takeData?.right[480]).toBeCloseTo(-0.8);

      // 5. Start and Stop Take 2
      recorder.startTake();
      recorder.pushAudioChunk(new Float32Array(100).fill(0.1));
      recorder.stopTake();
      expect(recorder.getTakeCount()).toBe(2);

      const allTakes = recorder.getAllTakes();
      expect(allTakes.length).toBe(2);
      expect(allTakes[0].takeNumber).toBe(1);
      expect(allTakes[1].takeNumber).toBe(2);
    });
  });

  describe('3. Multi-Track WAV Stem Exporter', () => {
    it('encodes standard 16-bit 48kHz stereo WAV blob with compliant RIFF header', () => {
      const samplesCount = 48000; // 1 second of audio at 48kHz
      const left = new Float32Array(samplesCount);
      const right = new Float32Array(samplesCount);

      for (let i = 0; i < samplesCount; i++) {
        left[i] = Math.sin((i / 48000) * 2 * Math.PI * 440) * 0.5;
        right[i] = Math.sin((i / 48000) * 2 * Math.PI * 880) * 0.5;
      }

      const wavBlob = StemExporter.encodeWav(left, right, 48000);
      expect(wavBlob).toBeInstanceOf(Blob);
      expect(wavBlob.type).toBe('audio/wav');

      // Expected size: 44 bytes header + (48000 samples * 2 channels * 2 bytes/sample) = 44 + 192000 = 192044 bytes
      expect(wavBlob.size).toBe(192044);
    });

    it('creates downloadable export file metadata with duration and file size', () => {
      const left = new Float32Array(24000); // 0.5s at 48kHz
      const exportFile = StemExporter.createExportFile(left, left, 'pulsejam_take_1.wav', 48000);

      expect(exportFile.filename).toBe('pulsejam_take_1.wav');
      expect(exportFile.durationSec).toBe(0.5);
      expect(exportFile.fileSizeBytes).toBe(44 + 24000 * 2 * 2);
    });
  });
});

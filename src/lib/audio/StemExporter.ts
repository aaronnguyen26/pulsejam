/**
 * PulseJam Stage 3 — Multi-Track WAV Stem Exporter
 *
 * Converts recorded Float32Array PCM audio into broadcast-grade 16-bit / 24-bit 48kHz stereo WAV files.
 * Generates downloadable Blob packages for Live Mic In, AI Companion, and Master Mix Stems.
 */

export interface ExportedWavFile {
  filename: string;
  blob: Blob;
  url: string;
  durationSec: number;
  fileSizeBytes: number;
}

export class StemExporter {
  /**
   * Encodes stereo or mono Float32Array channels into a standard 16-bit PCM WAV Blob.
   */
  public static encodeWav(
    left: Float32Array,
    right?: Float32Array,
    sampleRate: number = 48000
  ): Blob {
    const isStereo = right !== undefined;
    const numChannels = isStereo ? 2 : 1;
    const bytesPerSample = 2; // 16-bit PCM
    const numSamples = left.length;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // 1. RIFF Header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, totalSize - 8, true); // Little-endian
    this.writeString(view, 8, 'WAVE');

    // 2. Format Chunk ('fmt ')
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // BitsPerSample = 16

    // 3. Data Chunk ('data')
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // 4. Interleave & Quantize 32-bit Float -> 16-bit Signed Integer
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      // Left channel
      const sL = Math.max(-1, Math.min(1, left[i]));
      const intSampleL = sL < 0 ? sL * 0x8000 : sL * 0x7fff;
      view.setInt16(offset, Math.floor(intSampleL), true);
      offset += 2;

      // Right channel (if stereo)
      if (isStereo && right) {
        const sR = Math.max(-1, Math.min(1, right[i]));
        const intSampleR = sR < 0 ? sR * 0x8000 : sR * 0x7fff;
        view.setInt16(offset, Math.floor(intSampleR), true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Helper to export a single track with filename and Object URL metadata.
   */
  public static createExportFile(
    left: Float32Array,
    right?: Float32Array,
    filename: string = 'take.wav',
    sampleRate: number = 48000
  ): ExportedWavFile {
    const blob = this.encodeWav(left, right, sampleRate);
    const url = typeof URL !== 'undefined' ? URL.createObjectURL(blob) : '';
    const durationSec = left.length / sampleRate;

    return {
      filename,
      blob,
      url,
      durationSec,
      fileSizeBytes: blob.size,
    };
  }

  /**
   * Helper to write ASCII strings to DataView.
   */
  private static writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

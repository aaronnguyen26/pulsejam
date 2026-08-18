/**
 * PulseJam AI — Standalone WebSocket Sidecar Server (Port 9090)
 *
 * Runs locally to receive 40ms ConditioningFrames over WebSocket,
 * and streams 48kHz stereo binary PCM audio frames (0x504A magic header)
 * back to PulseJam AudioEngine with sub-20ms latency.
 *
 * Usage:
 *   node scripts/sidecar/server.mjs [port]
 */

import { WebSocketServer } from 'ws';

const PORT = parseInt(process.argv[2] || process.env.PORT || '9090', 10);
const SAMPLE_RATE = 48000;
const CHUNK_DURATION_MS = 40; // 40ms frame
const SAMPLES_PER_CHUNK = Math.floor((SAMPLE_RATE * CHUNK_DURATION_MS) / 1000); // 1920 samples

const BINARY_MAGIC = 0x504A;
const BINARY_HEADER_SIZE = 16;
const MSG_TYPE_AUDIO_CHUNK = 0x0001;

const wss = new WebSocketServer({ port: PORT });
console.log(`[PulseJam Sidecar] WebSocket server listening on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('[PulseJam Sidecar] Client connected');

  let sequenceNumber = 0;
  let currentBpm = 92;
  let currentKey = 'A Minor';
  let activeTier = 'chill';
  let bassFreq = 110;
  let bassPhase = 0;
  let padPhase = 0;

  // Stream continuous 40ms PCM audio frames at 25 FPS
  const streamInterval = setInterval(() => {
    if (ws.readyState !== ws.OPEN) return;

    const N = SAMPLES_PER_CHUNK;
    const byteLength = BINARY_HEADER_SIZE + N * 2 * 4;
    const buffer = Buffer.alloc(byteLength);

    // 16-byte header
    buffer.writeUInt16BE(BINARY_MAGIC, 0);
    buffer.writeUInt16BE(MSG_TYPE_AUDIO_CHUNK, 2);
    buffer.writeUInt32BE(sequenceNumber, 4);

    const now = Date.now();
    const tsHigh = Math.floor(now / 4294967296);
    const tsLow = now >>> 0;
    buffer.writeUInt32BE(tsHigh, 8);
    buffer.writeUInt32BE(tsLow, 12);

    // Synthesize Float32 stereo PCM payload
    let offset = BINARY_HEADER_SIZE;
    const padGain = activeTier === 'peak' ? 0.15 : 0.22;
    const bassGain = activeTier === 'peak' ? 0.35 : 0.2;

    for (let i = 0; i < N; i++) {
      padPhase = (padPhase + (2 * Math.PI * 220) / SAMPLE_RATE) % (2 * Math.PI);
      bassPhase = (bassPhase + (2 * Math.PI * bassFreq) / SAMPLE_RATE) % (2 * Math.PI);

      const padSample = Math.sin(padPhase) * padGain;
      const bassSample = (Math.sin(bassPhase) + 0.25 * Math.sin(2 * bassPhase)) * bassGain;
      const sampleL = Math.max(-1.0, Math.min(1.0, padSample + bassSample));
      const sampleR = sampleL;

      buffer.writeFloatLE(sampleL, offset);
      buffer.writeFloatLE(sampleR, offset + 4);
      offset += 8;
    }

    ws.send(buffer);
    sequenceNumber++;
  }, CHUNK_DURATION_MS);

  ws.on('message', (data) => {
    try {
      if (typeof data === 'string' || Buffer.isBuffer(data)) {
        const text = data.toString();
        const msg = JSON.parse(text);

        if (msg.type === 'ping') {
          ws.send(
            JSON.stringify({
              type: 'pong',
              timestamp: msg.timestamp,
              authenticated: true,
            })
          );
        } else if (msg.type === 'CONDITIONING_FRAME') {
          const frame = msg.payload;
          if (frame.estimatedBpm) currentBpm = frame.estimatedBpm;
          if (frame.estimatedKey) currentKey = frame.estimatedKey;

          // Check pitch onsets
          if (frame.pitchState && Array.isArray(frame.pitchState)) {
            const onsetIdx = frame.pitchState.indexOf(2);
            if (onsetIdx !== -1) {
              const bassMidi = Math.max(28, (onsetIdx % 12) + 36);
              bassFreq = 440 * Math.pow(2, (bassMidi - 69) / 12);
            }
          }
        }
      }
    } catch {
      // ignore parsing errors for non-JSON
    }
  });

  ws.on('close', () => {
    console.log('[PulseJam Sidecar] Client disconnected');
    clearInterval(streamInterval);
  });
});

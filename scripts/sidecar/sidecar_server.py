#!/usr/bin/env python3
"""
PulseJam Stage 2 — Native WebSocket Sidecar Server (Milestone 2: MRT2 Real-Time Audio Generation)

Features:
1. Low-latency Binary WebSocket Protocol: packs 16-byte header [Magic: 'PJ' | MsgType: 1 | Seq: uint32 | Timestamp: uint64]
   followed by raw Float32 PCM stereo audio bytes. Eliminates JSON serialization bottleneck.
2. Ephemeral Auth Token Security: rejects unauthorized localhost connections.
3. Apple Silicon MLX GPU acceleration for Google Magenta RealTime 2 (MRT2).
4. Graceful Fallback / Mock audio generation when MLX dependencies are not installed in dev/test environments.
"""

import argparse
import asyncio
import json
import logging
import math
import os
import struct
import sys
import time
import urllib.parse
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

try:
    import websockets  # type: ignore
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    websockets = None  # type: ignore

# Import MRT2 / MLX dependencies
try:
    import numpy as np  # type: ignore
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

try:
    from magenta_rt import MagentaRT2StdMlxfn  # type: ignore
    from magenta_rt.config import MUSICCOCA, PIANOROLL_WITH_ONSETS  # type: ignore
    MRT2_AVAILABLE = True
except ImportError as e:
    MRT2_AVAILABLE = False

logging.basicConfig(
    level=logging.INFO,
    format='[Sidecar Server %(asctime)s] %(levelname)s: %(message)s',
    datefmt='%H:%M:%S',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger('PulseJamSidecar')

# Constants
BINARY_MAGIC = b'PJ'
MSG_AUDIO_CHUNK = 0x0001
MAX_STYLE_CACHE_ENTRIES = 64
MAX_PROMPT_LEN = 256
MAX_WS_MESSAGE_SIZE = 1024 * 1024  # 1 MB

# Global state
mrt_model = None
style_embed_cache: dict[str, object] = {}
AUTH_TOKEN = os.environ.get("SIDECAR_AUTH_TOKEN", None)

def load_mrt2_model():
    global mrt_model
    if not MRT2_AVAILABLE:
        logger.warning("Magenta RT2 dependencies missing. Running in Synthetic Simulation Mode.")
        return None
    logger.info("Initializing Google Magenta RealTime 2 (MRT2 Small MLX backend)...")
    t0 = time.perf_counter()
    mrt_model = MagentaRT2StdMlxfn("mrt2_small")
    t1 = time.perf_counter()
    logger.info(f"MRT2 Small MLX model loaded successfully in {t1 - t0:.2f}s!")
    return mrt_model

def get_cached_style_embedding(style_prompt: str):
    prompt_key = str(style_prompt).strip()[:MAX_PROMPT_LEN] if style_prompt else "steady groove"
    if prompt_key not in style_embed_cache:
        if len(style_embed_cache) >= MAX_STYLE_CACHE_ENTRIES:
            oldest_key = next(iter(style_embed_cache))
            del style_embed_cache[oldest_key]
        if mrt_model is not None:
            logger.info(f"Embedding style prompt: '{prompt_key}'...")
            style_embed_cache[prompt_key] = mrt_model.embed_style(prompt_key, use_mapper=True)
        else:
            style_embed_cache[prompt_key] = None
    return style_embed_cache[prompt_key]

def sanitize_pitch_state(raw_pitch_state):
    default_state = [-1] * 128
    if not isinstance(raw_pitch_state, list):
        return default_state
    if len(raw_pitch_state) != 128:
        raw_pitch_state = (raw_pitch_state + default_state)[:128]
    sanitized = []
    for val in raw_pitch_state:
        try:
            int_val = int(val)
            sanitized.append(max(-1, min(127, int_val)))
        except (ValueError, TypeError):
            sanitized.append(-1)
    return sanitized

def generate_synthetic_chunk(seq: int = 0, pitch_state=None):
    """Generates synthetic 40ms 48kHz stereo PCM (1920 samples/channel = 3840 floats) for fallback/testing."""
    samples_per_ch = 1920
    sample_rate = 48000
    freq = 220.0
    if pitch_state:
        for p, state in enumerate(pitch_state):
            if state in (1, 2):
                freq = 440.0 * (2.0 ** ((p - 69) / 12.0))
                break

    if NUMPY_AVAILABLE:
        t = (np.arange(samples_per_ch) + seq * samples_per_ch) / sample_rate
        sine_wave = (np.sin(2 * np.pi * freq * t) * 0.3).astype(np.float32)
        stereo = np.column_stack((sine_wave, sine_wave))
        return stereo
    else:
        pcm = []
        for i in range(samples_per_ch):
            t = (seq * samples_per_ch + i) / sample_rate
            val = math.sin(2 * math.pi * freq * t) * 0.3
            pcm.extend([val, val])
        return pcm

def pack_binary_frame(sequence_number: int, timestamp: int, samples) -> bytes:
    """Packs a 16-byte header [Magic: 'PJ' | MsgType: 1 | Seq: uint32 | Timestamp: uint64] + Float32 PCM."""
    header = struct.pack('>2sHIQ', BINARY_MAGIC, MSG_AUDIO_CHUNK, sequence_number, timestamp)
    if NUMPY_AVAILABLE and isinstance(samples, np.ndarray):
        pcm_bytes = samples.astype(np.float32).tobytes()
    elif isinstance(samples, (list, tuple)):
        pcm_bytes = struct.pack(f'>{len(samples)}f', *samples)
    else:
        pcm_bytes = bytes(samples)
    return header + pcm_bytes

def generate_mrt2_frame(pitch_state: list, style_prompt: str, state):
    if mrt_model is None:
        return None, state
    try:
        text_emb = get_cached_style_embedding(style_prompt)
        cond = {
            MUSICCOCA.key: text_emb,
            PIANOROLL_WITH_ONSETS.key: pitch_state
        }
        chunk, next_state = mrt_model.generate(conditioning=cond, frames=1, state=state)
        return chunk, next_state
    except Exception as e:
        logger.error(f"Inference error during frame generation: {e}")
        return None, state

async def handle_client(websocket):
    client_address = websocket.remote_address
    logger.info(f"Client connected from {client_address}")

    # Check authentication token if configured
    is_authenticated = True
    if AUTH_TOKEN:
        is_authenticated = False
        # Check query parameters (e.g. ?token=...)
        try:
            req_path = getattr(websocket, 'path', '') or ''
            if '?' in req_path:
                query_str = req_path.split('?', 1)[1]
                params = urllib.parse.parse_qs(query_str)
                if params.get('token', [None])[0] == AUTH_TOKEN:
                    is_authenticated = True
        except Exception:
            pass

    if mrt_model is None and MRT2_AVAILABLE:
        load_mrt2_model()

    health_msg = {
        "type": "sidecar_status",
        "status": "healthy",
        "version": "2.1.0-binary",
        "server": "PulseJam Native Sidecar (Binary Zero-Copy Engine)",
        "mrt2Loaded": (mrt_model is not None),
        "authRequired": bool(AUTH_TOKEN),
        "authenticated": is_authenticated,
        "timestamp": int(time.time() * 1000)
    }
    await websocket.send(json.dumps(health_msg))

    mrt_state = None
    sequence_number = 0
    frame_count = 0
    binary_mode = True

    try:
        async for message in websocket:
            try:
                if isinstance(message, (bytes, bytearray)):
                    continue # Ignore unexpected raw incoming bytes

                data = json.loads(message)
                msg_type = data.get("type")

                # Handle auth token verification via ping or auth message
                if not is_authenticated:
                    provided_token = data.get("token") or data.get("authToken")
                    if provided_token == AUTH_TOKEN:
                        is_authenticated = True
                        logger.info(f"Client {client_address} successfully authenticated with token")
                    elif msg_type == "ping":
                        pong_response = {
                            "type": "pong",
                            "timestamp": data.get("timestamp", int(time.time() * 1000)),
                            "authenticated": False
                        }
                        await websocket.send(json.dumps(pong_response))
                        continue
                    else:
                        await websocket.send(json.dumps({
                            "type": "AUTH_FAILED",
                            "message": "Unauthorized: valid auth token required"
                        }))
                        continue

                if msg_type == "ping":
                    timestamp = data.get("timestamp", int(time.time() * 1000))
                    pong_response = {
                        "type": "pong",
                        "timestamp": timestamp,
                        "authenticated": True
                    }
                    await websocket.send(json.dumps(pong_response))

                elif msg_type == "CONFIG":
                    if "useBinary" in data:
                        binary_mode = bool(data["useBinary"])
                        logger.info(f"Client set binary streaming mode to {binary_mode}")

                elif msg_type == "CONDITIONING_FRAME":
                    payload = data.get("payload", {})
                    raw_pitch_state = payload.get("pitchState", [-1] * 128)
                    pitch_state = sanitize_pitch_state(raw_pitch_state)
                    raw_style_prompt = payload.get("stylePrompt", "steady groove")
                    style_prompt = str(raw_style_prompt).strip()[:MAX_PROMPT_LEN]
                    frame_ts = payload.get("timestamp", int(time.time() * 1000))

                    samples = None
                    if mrt_model is not None:
                        chunk, mrt_state = generate_mrt2_frame(pitch_state, style_prompt, mrt_state)
                        if chunk is not None and chunk.samples is not None:
                            samples = chunk.samples
                    else:
                        # Synthetic fallback generation
                        samples = generate_synthetic_chunk(sequence_number, pitch_state)

                    if samples is not None:
                        if binary_mode:
                            binary_frame = pack_binary_frame(sequence_number, frame_ts, samples)
                            await websocket.send(binary_frame)
                        else:
                            # JSON fallback
                            if NUMPY_AVAILABLE and isinstance(samples, np.ndarray):
                                left = samples[:, 0].tolist()
                                right = samples[:, 1].tolist()
                            else:
                                left = samples[0::2]
                                right = samples[1::2]
                            audio_msg = {
                                "type": "AUDIO_CHUNK",
                                "sequenceNumber": sequence_number,
                                "timestamp": frame_ts,
                                "pcmData": [left, right]
                            }
                            await websocket.send(json.dumps(audio_msg))

                        sequence_number += 1
                        frame_count += 1
                        if frame_count % 50 == 0:
                            logger.info(f"Streamed {frame_count} frames (seq #{sequence_number}, binary={binary_mode})")

            except json.JSONDecodeError:
                logger.error("Received non-JSON string message")
            except Exception as e:
                logger.error(f"Error processing client message: {e}")

    except websockets.exceptions.ConnectionClosedOK:
        logger.info(f"Client {client_address} disconnected normally")
    except websockets.exceptions.ConnectionClosedError as e:
        logger.warning(f"Client {client_address} connection closed with error: {e}")
    except Exception as e:
        logger.error(f"Unexpected connection error for {client_address}: {e}")
    finally:
        logger.info(f"Cleaned up client {client_address} (streamed {frame_count} frames)")

async def main():
    if not WEBSOCKETS_AVAILABLE:
        logger.error("Missing required dependency 'websockets'. Please install: pip install -r scripts/sidecar/requirements.txt")
        sys.exit(1)

    parser = argparse.ArgumentParser(description="PulseJam Native MRT2 Sidecar Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host address to bind to (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=9090, help="Port to listen on (default: 9090)")
    parser.add_argument("--token", default=None, help="Ephemeral auth token required for connections")
    args = parser.parse_args()

    global AUTH_TOKEN
    if args.token:
        AUTH_TOKEN = args.token

    logger.info(f"Starting PulseJam Stage 2 Native Sidecar on ws://{args.host}:{args.port}...")
    if AUTH_TOKEN:
        logger.info("Authentication enabled with ephemeral token.")
    else:
        logger.info("Authentication disabled (open localhost mode).")

    async with websockets.serve(handle_client, args.host, args.port, max_size=MAX_WS_MESSAGE_SIZE):  # type: ignore
        logger.info(f"Sidecar listening and ready on ws://{args.host}:{args.port}")
        await asyncio.Future()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Sidecar server shut down cleanly.")
        sys.exit(0)

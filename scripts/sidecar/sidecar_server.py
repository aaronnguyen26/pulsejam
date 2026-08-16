#!/usr/bin/env python3
"""
PulseJam Stage 2 — Native WebSocket Sidecar Server (Milestone 2: MRT2 Real-Time Audio Generation)

Listens on ws://localhost:9090 for incoming WebSocket connections from ConditioningBridge.
1. Handles latency ping/pong handshakes and maintains sidecar health status.
2. Loads Google Magenta RealTime 2 (MRT2 Small, MLX backend).
3. Receives 40ms ConditioningFrame payloads (pitchState, stylePrompt, mode).
4. Generates 40ms 48kHz stereo Float32 PCM audio chunks (1920, 2) in real time (~15ms/frame).
5. Streams AUDIO_CHUNK messages back over WebSocket to AIAudioReceiver.pushChunk().
"""

import asyncio
import json
import logging
import sys
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)
import time
import websockets


# Import MRT2 dependencies
try:
    from magenta_rt import MagentaRT2StdMlxfn
    from magenta_rt.config import MUSICCOCA, PIANOROLL_WITH_ONSETS
    MRT2_AVAILABLE = True
except ImportError as e:
    MRT2_AVAILABLE = False
    print(f"Warning: Magenta RT dependencies could not be imported: {e}")

logging.basicConfig(
    level=logging.INFO,
    format='[Sidecar Server %(asctime)s] %(levelname)s: %(message)s',
    datefmt='%H:%M:%S',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger('PulseJamSidecar')


HOST = '127.0.0.1'
PORT = 9090
MAX_STYLE_CACHE_ENTRIES = 64
MAX_PROMPT_LEN = 256
MAX_WS_MESSAGE_SIZE = 1024 * 1024  # 1 MB

# Global MRT2 model instance & bounded embedding cache
mrt_model = None
style_embed_cache: dict[str, object] = {}

def load_mrt2_model():
    global mrt_model
    if not MRT2_AVAILABLE:
        logger.error("Magenta RT2 dependencies missing. Cannot load MRT2 model.")
        return None
    logger.info("Initializing Google Magenta RealTime 2 (MRT2 Small MLX backend)...")
    t0 = time.perf_counter()
    mrt_model = MagentaRT2StdMlxfn("mrt2_small")
    t1 = time.perf_counter()
    logger.info(f"MRT2 Small MLX model loaded successfully in {t1 - t0:.2f}s!")
    return mrt_model

def get_cached_style_embedding(style_prompt: str):
    # Sanitize and truncate prompt
    prompt_key = str(style_prompt).strip()[:MAX_PROMPT_LEN] if style_prompt else "steady groove"
    if prompt_key not in style_embed_cache:
        # Enforce LRU/FIFO bound on cache size to prevent memory exhaustion
        if len(style_embed_cache) >= MAX_STYLE_CACHE_ENTRIES:
            oldest_key = next(iter(style_embed_cache))
            del style_embed_cache[oldest_key]
        logger.info(f"Embedding new style prompt: '{prompt_key}'...")
        style_embed_cache[prompt_key] = mrt_model.embed_style(prompt_key, use_mapper=True)
    return style_embed_cache[prompt_key]

def sanitize_pitch_state(raw_pitch_state):
    """Ensure pitch state is a valid 128-element integer list in [-1, 127]."""
    default_state = [-1] * 128
    if not isinstance(raw_pitch_state, list):
        return default_state
    if len(raw_pitch_state) != 128:
        # Pad or slice to 128 elements
        raw_pitch_state = (raw_pitch_state + default_state)[:128]
    sanitized = []
    for val in raw_pitch_state:
        try:
            int_val = int(val)
            sanitized.append(max(-1, min(127, int_val)))
        except (ValueError, TypeError):
            sanitized.append(-1)
    return sanitized

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

    if mrt_model is None:
        load_mrt2_model()

    # Send initial health acknowledgment to connected client
    health_msg = {
        "type": "sidecar_status",
        "status": "healthy",
        "version": "2.0.0-m2",
        "server": "PulseJam Native Sidecar (Milestone 2 MRT2 Real-Time Engine)",
        "mrt2Loaded": (mrt_model is not None),
        "timestamp": int(time.time() * 1000)
    }
    await websocket.send(json.dumps(health_msg))

    mrt_state = None
    sequence_number = 0
    frame_count = 0

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                msg_type = data.get("type")

                if msg_type == "ping":
                    timestamp = data.get("timestamp", int(time.time() * 1000))
                    pong_response = {
                        "type": "pong",
                        "timestamp": timestamp
                    }
                    await websocket.send(json.dumps(pong_response))

                elif msg_type == "CONDITIONING_FRAME":
                    payload = data.get("payload", {})
                    raw_pitch_state = payload.get("pitchState", [-1] * 128)
                    pitch_state = sanitize_pitch_state(raw_pitch_state)
                    raw_style_prompt = payload.get("stylePrompt", "steady groove")
                    style_prompt = str(raw_style_prompt).strip()[:MAX_PROMPT_LEN]
                    frame_ts = payload.get("timestamp", int(time.time() * 1000))

                    if mrt_model is not None:
                        # Synchronous MLX model inference on main thread (~15ms execution)
                        chunk, mrt_state = generate_mrt2_frame(pitch_state, style_prompt, mrt_state)

                        if chunk is not None and chunk.samples is not None:
                            samples = chunk.samples  # shape (1920, 2)
                            left = samples[:, 0].tolist()
                            right = samples[:, 1].tolist()

                            audio_msg = {
                                "type": "AUDIO_CHUNK",
                                "sequenceNumber": sequence_number,
                                "timestamp": frame_ts,
                                "pcmData": [left, right]
                            }
                            await websocket.send(json.dumps(audio_msg))
                            sequence_number += 1
                            frame_count += 1
                            if frame_count % 25 == 0:
                                logger.info(f"Generated and streamed {frame_count} MRT2 audio chunks (seq #{sequence_number})")

                else:
                    logger.warning(f"Received unknown message type: {msg_type}")

            except json.JSONDecodeError:
                logger.error("Received non-JSON binary or string message")
            except Exception as e:
                logger.error(f"Error processing message: {e}")

    except websockets.exceptions.ConnectionClosedOK:
        logger.info(f"Client {client_address} disconnected normally")
    except websockets.exceptions.ConnectionClosedError as e:
        logger.warning(f"Client {client_address} connection closed with error: {e}")
    except Exception as e:
        logger.error(f"Unexpected connection error for {client_address}: {e}")
    finally:
        logger.info(f"Cleaned up client connection for {client_address} (total frames streamed: {frame_count})")

async def main():
    logger.info(f"Starting PulseJam Stage 2 Native Sidecar WebSocket Server on ws://{HOST}:{PORT}...")
    async with websockets.serve(handle_client, HOST, PORT, max_size=MAX_WS_MESSAGE_SIZE):
        logger.info(f"Server is listening and ready for ConditioningBridge connections on ws://{HOST}:{PORT}")
        await asyncio.Future()  # Run forever

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Sidecar server shut down by KeyboardInterrupt")
        sys.exit(0)

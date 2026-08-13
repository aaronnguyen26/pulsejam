import asyncio
import json
import websockets
import time

async def test_client():
    async with websockets.connect("ws://127.0.0.1:9090") as ws:
        print("Connected to sidecar!")
        # Receive health status first
        health_msg = await ws.recv()
        print("Received Health Msg:", health_msg)

        # Send Ping
        ping_ts = int(time.time() * 1000)
        await ws.send(json.dumps({"type": "ping", "timestamp": ping_ts}))
        pong_res = await ws.recv()
        print("Received Pong Msg:", pong_res)

        # Send 5 conditioning frames and receive generated audio chunks
        for i in range(5):
            frame = {
                "type": "CONDITIONING_FRAME",
                "payload": {
                    "pitchState": [-1]*128,
                    "stylePrompt": "driving energetic synthwave",
                    "mode": "midi+audio",
                    "timestamp": int(time.time() * 1000)
                }
            }
            await ws.send(json.dumps(frame))
            chunk_res = await ws.recv()
            chunk_data = json.loads(chunk_res)
            pcm_channels = chunk_data.get("pcmData", [])
            left_len = len(pcm_channels[0]) if len(pcm_channels) > 0 else 0
            right_len = len(pcm_channels[1]) if len(pcm_channels) > 1 else 0
            print(f"✅ Received AUDIO_CHUNK #{i}: seq={chunk_data.get('sequenceNumber')}, L_len={left_len}, R_len={right_len}")
            await asyncio.sleep(0.04)

if __name__ == '__main__':
    asyncio.run(test_client())

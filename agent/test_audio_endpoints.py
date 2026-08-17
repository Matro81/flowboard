import asyncio
import json
import httpx

endpoints = [
    '/v1/flow/audioPresets',
    '/v1/flow/presetVoices',
    '/v1/flow/voices',
    '/v1/flow/speakers',
    '/v1/flow/presetAudios',
    '/v1/flow/audio/presets',
    '/v1/flowAudio:listPresets',
    '/v1/flowAudio/presets',
    '/v1/flow:listAudioPresets',
    '/v1/flowCollections/audio',
    '/v1/flow/models/statuses',
]

async def main():
    async with httpx.AsyncClient(timeout=15.0) as client:
        for ep in endpoints:
            try:
                r = await client.post(
                    'http://127.0.0.1:8101/api/flow/voices/discover',
                    # Let's hit the server
                )
                # Let's test directly with python calling local endpoint or making api_request
            except Exception as e:
                pass

asyncio.run(main())

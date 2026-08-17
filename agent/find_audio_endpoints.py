import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
url = 'https://labs.google/fx/_next/static/chunks/pages/_app-8a4db99aeb18b88b.js'
res = client.get(url)

# Search for trpc procedures for voices/presets
# E.g. trpc.voice.getPresets or trpc.audio.getPresets or getPresetAudios
trpc_calls = re.findall(r'["\']([a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+)["\']', res.text)
audio_trpc = [t for t in set(trpc_calls) if any(w in t.lower() for w in ['voice', 'audio', 'preset', 'sound', 'speaker'])]
print('Audio/Voice TRPC calls:', audio_trpc)

# Search for endpoint paths like /preset, /voices, /audios
urls = re.findall(r'["\'](/v1/[a-zA-Z0-9_\-/\:]+)["\']', res.text)
print('V1 endpoints:', set(urls))

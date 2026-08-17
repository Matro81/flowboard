import httpx
import re
import json

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
url = 'https://labs.google/fx/_next/static/chunks/pages/_app-8a4db99aeb18b88b.js'
res = client.get(url)

# Find all occurrences of audioSamplePath, baseSpeakerName or speaker
matches = re.finditer(r'baseSpeakerName', res.text)
for m in matches:
    idx = m.start()
    print('Match at:', idx)

# Let's search for fifeUrl or googleusercontent or storage.googleapis.com audio files in the JS
audio_urls = re.findall(r'https?://[^\s"\'\<\>]+(?:\.mp3|\.wav|audio|sound)[^\s"\'\<\>]*', res.text)
print('Found audio urls in bundle:', audio_urls)

# Search for any preset arrays
presets = re.findall(r'(\[\s*\{[^{}]*?(?:speaker|baseSpeaker|voicePerformance|audioSamplePath)[^{}]*?\}\s*\])', res.text)
print('Presets found count:', len(presets))
for p in presets[:5]:
    print('Preset:', p)

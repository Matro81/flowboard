import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
url = 'https://labs.google/fx/_next/static/chunks/pages/_app-8a4db99aeb18b88b.js'
res = client.get(url)

# Find all occurrences of "presetVoice" or "presetVoices" or "audios"
indices = [m.start() for m in re.finditer(r'presetVoice', res.text)]
print('presetVoice occurrences:', len(indices))

for idx in indices:
    start = max(0, idx - 300)
    end = min(len(res.text), idx + 500)
    print('--- SNIPPET ---')
    print(res.text[start:end])
    print('---------------\n')

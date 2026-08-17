import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
url = 'https://labs.google/fx/_next/static/chunks/9968-405b3af5cbf6c1ea.js'
res = client.get(url)

indices = [m.start() for m in re.finditer(r'voice_selection', res.text)]
print('voice_selection in 9968 count:', len(indices))
for idx in indices:
    start = max(0, idx - 800)
    end = min(len(res.text), idx + 1200)
    print('--- VOICE SELECTION COMPONENT IN CHUNK 9968 ---')
    print(res.text[start:end])
    print('------------------------------------------------\n')

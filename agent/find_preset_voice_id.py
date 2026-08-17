import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
url = 'https://labs.google/fx/_next/static/chunks/pages/_app-8a4db99aeb18b88b.js'
res = client.get(url)

for m in re.finditer(r'presetVoiceId', res.text):
    idx = m.start()
    start = max(0, idx - 400)
    end = min(len(res.text), idx + 600)
    print('--- presetVoiceId snippet ---')
    print(res.text[start:end])
    print('-----------------------------\n')

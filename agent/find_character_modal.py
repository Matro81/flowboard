import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
url = 'https://labs.google/fx/_next/static/chunks/pages/_app-8a4db99aeb18b88b.js'
res = client.get(url)

# Search for the Character creation modal / character properties in JS
for m in re.finditer(r'personalityNotes|characterInfo|voiceConfigs', res.text):
    idx = m.start()
    start = max(0, idx - 300)
    end = min(len(res.text), idx + 500)
    print('--- CHARACTER / VOICE CONTEXT ---')
    print(res.text[start:end])
    print('---------------------------------\n')

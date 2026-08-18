import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
r = client.get('https://labs.google/fx/_next/static/chunks/pages/_app-8a4db99aeb18b88b.js')

for m in re.finditer(r'imageReferences', r.text):
    idx = m.start()
    print("Match around imageReferences:")
    print(r.text[idx-100:idx+250])
    print("=" * 40)

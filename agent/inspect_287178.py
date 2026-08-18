import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
r = client.get('https://labs.google/fx/_next/static/chunks/pages/_app-8a4db99aeb18b88b.js')

idx = r.text.find("'imageReferences':_0x152125['YO'](_0x287178)")
print("=== SCHEMA OF _0x287178 ===")
print(r.text[idx-500:idx+500])

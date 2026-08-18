import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
r = client.get('https://labs.google/fx/_next/static/chunks/pages/_app-8a4db99aeb18b88b.js')

idx = r.text.find('_0x287178=')
print("=== _0x287178 definition ===")
print(r.text[idx:idx+300])

idx_audio = r.text.find('_0x6ebc83=')
print("=== _0x6ebc83 definition ===")
print(r.text[idx_audio:idx_audio+300])

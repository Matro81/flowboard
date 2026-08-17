import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
url = 'https://labs.google/fx/_next/static/chunks/pages/_app-8a4db99aeb18b88b.js'
res = client.get(url)

# Search for patterns where speaker names are defined: e.g. speaker: "...", name: "..."
# Look for array of objects with speaker or name
matches = re.findall(r'(\{[^{}]*?speaker[^{}]*?\})', res.text)
print('Speaker objects count:', len(matches))
for m in matches[:20]:
    print('  Object:', m)

# Also search for voice lists or string arrays
# Let's search for "speaker" or "Voice" in all quotes
quotes = re.findall(r'["\']([a-zA-Z0-9_\-\s]{2,40})["\']', res.text)
voice_related = [q for q in set(quotes) if any(w in q.lower() for w in ['voice', 'speaker']) and len(q) < 35]
print('\nVoice-related string literals in app:')
for v in sorted(voice_related):
    print(' ', v)

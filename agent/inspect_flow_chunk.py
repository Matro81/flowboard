import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
url = 'https://labs.google/fx/_next/static/chunks/pages/tools/flow-f0020e30640b3e0d.js'
res = client.get(url)

print('flow chunk length:', len(res.text))

# Search for all chunk IDs referenced by webpack in this chunk
imported_chunks = re.findall(r'static/chunks/[^"\']+\.js', res.text)
print('Imported chunks in flow.js:', len(imported_chunks))

# Search for voices or speakers or audio in flow.js
for line in res.text.split(';'):
    if any(k in line.lower() for k in ['voice', 'speaker', 'audio', 'sound']):
        if len(line) < 300:
            print('Line:', line)

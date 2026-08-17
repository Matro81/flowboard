import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
url = 'https://labs.google/fx/_next/static/chunks/pages/_app-8a4db99aeb18b88b.js'
res = client.get(url)

print('App chunk length:', len(res.text))

# Let's find all occurrences of baseSpeakerName or Voice or Speaker
indices = [m.start() for m in re.finditer(r'baseSpeakerName', res.text)]
print('baseSpeakerName occurrences:', len(indices))

for idx in indices:
    start = max(0, idx - 400)
    end = min(len(res.text), idx + 600)
    snippet = res.text[start:end]
    print('--- SNIPPET ---')
    print(snippet)
    print('---------------\n')

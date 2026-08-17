import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
url = 'https://labs.google/fx/_next/static/chunks/pages/_app-8a4db99aeb18b88b.js'
res = client.get(url)

# Find all TRPC procedures: e.g. ["procedureName", ...]
# In tRPC client bundles, query paths appear as string arrays: e.g. ['project', 'searchUserProjects'] or 'project.createProject'
matches = re.findall(r'(\[[^\]]*?[\'"][a-zA-Z0-9_]+[\'"]\s*,\s*[\'"][a-zA-Z0-9_]+[\'"][^\]]*?\])', res.text)
print('Array matches:', len(matches))

trpc_routes = set()
for m in matches:
    if any(k in m for k in ['project', 'user', 'voice', 'audio', 'asset', 'scene', 'media', 'character', 'likeness']):
        trpc_routes.add(m)

print('\nTRPC Candidate Tuples:')
for r in sorted(trpc_routes)[:40]:
    print(' ', r)

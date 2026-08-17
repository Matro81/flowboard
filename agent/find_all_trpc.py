import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
url = 'https://labs.google/fx/_next/static/chunks/pages/_app-8a4db99aeb18b88b.js'
res = client.get(url)

# Find all occurrences of trpc paths
# e.g. "project.", "user.", "applet.", "voice.", "audio."
# Match standard pattern: ["project.createProject", "project.searchUserProjects", etc.]
trpc_all = re.findall(r'["\']([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)["\']', res.text)
candidates = set()
for t in trpc_all:
    prefix = t.split('.')[0]
    if prefix in ['project', 'user', 'voice', 'audio', 'sound', 'character', 'entity', 'asset', 'likeness', 'media', 'applet', 'model', 'workflow', 'auth']:
        candidates.add(t)

print('All TRPC Endpoints in Google Flow:')
for c in sorted(candidates):
    print(' ', c)

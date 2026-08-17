import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=20.0)
r = client.get('https://labs.google/fx/tools/flow')
manifest_url = re.search(r'static/[a-zA-Z0-9_\-]+/_buildManifest\.js', r.text).group(0)
m_res = client.get('https://labs.google/fx/_next/' + manifest_url)
chunks = set(re.findall(r'static/chunks/[^"\']+\.js', m_res.text))

trpc_endpoints = set()
api_endpoints = set()

for c in sorted(chunks):
    res = client.get('https://labs.google/fx/_next/' + c)
    # Find trpc queries / mutations: e.g. "voice.", "audio.", "project.", "user."
    found_trpc = re.findall(r'["\']([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)["\']', res.text)
    for ft in found_trpc:
        if any(w in ft.lower() for w in ['voice', 'audio', 'sound', 'speaker', 'character', 'asset', 'project', 'media', 'speech']):
            trpc_endpoints.add(ft)
            
    # Find REST URLs
    found_urls = re.findall(r'["\'](/v1/[a-zA-Z0-9_\-/\:]+)["\']', res.text)
    api_endpoints.update(found_urls)

print('=== TRPC ROUTERS & PROCEDURES ===')
for ep in sorted(trpc_endpoints):
    print('  TRPC:', ep)

print('\n=== REST API ENDPOINTS ===')
for ep in sorted(api_endpoints):
    print('  REST:', ep)

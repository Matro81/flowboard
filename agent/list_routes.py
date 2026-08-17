import httpx
import re
import json

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
url = 'https://labs.google/fx/_next/static/esdx5hCP0o2w1BXzSezDe/_buildManifest.js'
res = client.get(url)

# Parse JS build manifest
clean = res.text.replace('self.__BUILD_MANIFEST = ', '').rstrip(';').replace('self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()', '').rstrip(';')
# Extract json
routes = re.findall(r'["\'](/[^"\']*)["\']\s*:\s*(\[[^\]]+\])', res.text)
for route, chunk_list in routes:
    print(f'Route: {route}')
    chunks = re.findall(r'["\']([^"\']+)["\']', chunk_list)
    print('  Chunks:', chunks)

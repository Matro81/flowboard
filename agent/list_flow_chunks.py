import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
r = client.get('https://labs.google/fx/tools/flow')
# Look for script chunks in HTML
scripts = re.findall(r'src="(/fx/_next/static/chunks/[^"]+)"', r.text)
print("Scripts in Flow HTML:", len(scripts))
for s in scripts:
    print(s)

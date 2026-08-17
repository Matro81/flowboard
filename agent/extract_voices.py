import httpx
import re
import json

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
}

client = httpx.Client(headers=headers, timeout=20.0, follow_redirects=True)
r = client.get('https://labs.google/fx/tools/flow')
next_data = json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', r.text).group(1))
build_id = next_data['buildId']

# Fetch build manifest, ssg manifest, react-loadable-manifest
manifests = [
    f'https://labs.google/fx/_next/static/{build_id}/_buildManifest.js',
    f'https://labs.google/fx/_next/static/{build_id}/_ssgManifest.js',
]

all_chunks = set()
for m in manifests:
    res = client.get(m)
    found = re.findall(r'["\'](static/chunks/[^"\']+\.js)["\']', res.text)
    all_chunks.update(found)

# Also check for chunks in the initial HTML
html_scripts = re.findall(r'static/chunks/[^"\']+\.js', r.text)
all_chunks.update(html_scripts)

# Check common project page chunk names
for p in ['pages/tools/flow', 'pages/tools/flow/project', 'pages/tools/flow/project/[id]', 'app/tools/flow']:
    # Let's search inside the chunks we found for other chunk IDs
    pass

print(f'Discovered {len(all_chunks)} chunks to check.')

voice_matches = []
for c in sorted(all_chunks):
    url = f'https://labs.google/fx/_next/{c}'
    try:
        res = client.get(url)
        # Search for any references to voice or audio
        if 'voice' in res.text.lower() or 'audio' in res.text.lower():
            # Check for other chunk references: e.g. e.u("1234") or [123, "static/chunks/..."]
            more_chunks = re.findall(r'static/chunks/[^"\']+\.js', res.text)
            all_chunks.update(more_chunks)
            
            # Find any arrays of voice names or objects
            # Let's search for patterns like {id:"...", name:"...", ...} or ["Aoede", ...]
            for line in res.text.split(';'):
                if 'audioSamplePath' in line or 'baseSpeakerName' in line or 'speaker' in line.lower() or 'voice' in line.lower():
                    if len(line) < 500 and any(k in line for k in ['name', 'label', 'gender', 'sample', 'id']):
                        voice_matches.append((c, line))
    except Exception as e:
        pass

print(f'\nFound {len(voice_matches)} voice code lines:')
for c, line in voice_matches[:30]:
    print(f'[{c}]: {line}\n')

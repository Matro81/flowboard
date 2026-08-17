import httpx
import re
import json

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
url = 'https://labs.google/fx/_next/static/chunks/pages/_app-8a4db99aeb18b88b.js'
res = client.get(url)

print('Scanning _app chunk for preset voices...')

# Search for isPresetAudioSample or baseSpeakerName references
indices = [m.start() for m in re.finditer(r'isPresetAudioSample', res.text)]
print('isPresetAudioSample occurrences:', len(indices))

for idx in indices:
    start = max(0, idx - 800)
    end = min(len(res.text), idx + 800)
    snippet = res.text[start:end]
    print('--- SNIPPET ---')
    print(snippet)
    print('---------------\n')

# Also search for voiceConfigs
vc_indices = [m.start() for m in re.finditer(r'voiceConfigs', res.text)]
print('voiceConfigs occurrences:', len(vc_indices))
for idx in vc_indices:
    start = max(0, idx - 400)
    end = min(len(res.text), idx + 400)
    snippet = res.text[start:end]
    print('--- VOICE CONFIG SNIPPET ---')
    print(snippet)
    print('----------------------------\n')

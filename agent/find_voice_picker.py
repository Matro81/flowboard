import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
url = 'https://labs.google/fx/_next/static/chunks/pages/_app-8a4db99aeb18b88b.js'
res = client.get(url)

# Search for the component that renders the voice picker in Character creation
# It uses voice_selection icon, or audioReferences, or presetVoiceId
indices = [m.start() for m in re.finditer(r'voice_selection', res.text)]
print('voice_selection count:', len(indices))
for idx in indices:
    start = max(0, idx - 400)
    end = min(len(res.text), idx + 800)
    print('--- VOICE PICKER COMPONENT ---')
    print(res.text[start:end])
    print('------------------------------\n')

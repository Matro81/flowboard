import httpx
import re
import json

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)

# Fetch manifest
r = client.get('https://labs.google/fx/tools/flow')
manifest_url = re.search(r'static/[a-zA-Z0-9_\-]+/_buildManifest\.js', r.text).group(0)
m_res = client.get('https://labs.google/fx/_next/' + manifest_url)
chunks = set(re.findall(r'static/chunks/[^"\']+\.js', m_res.text))

print(f'Scanning all {len(chunks)} chunks on Google Flow...')

all_speaker_strings = set()
for c in chunks:
    try:
        res = client.get('https://labs.google/fx/_next/' + c)
        # Search for arrays of strings or names in PascalCase that appear with voice/audio
        # Look for words next to "speaker" or "voice"
        if any(w in res.text for w in ['speaker', 'Speaker', 'voice', 'Voice', 'Aoede', 'Puck', 'Fenrir', 'Charon']):
            # Find all words that could be voice names
            # Search for pattern: 'speaker': '...' or speaker:"..." or "speakerName":"..."
            explicit_speakers = re.findall(r'(?:speaker|speakerName|baseSpeakerName|voiceName|presetVoiceId)["\']?\s*[:=]\s*["\']([a-zA-Z0-9_\-]+)["\']', res.text)
            all_speaker_strings.update(explicit_speakers)
            
            # Find quoted voice names in the chunk
            voice_names = re.findall(r'["\'](Aoede|Kore|Leda|Zephyr|Puck|Charon|Fenrir|Orpheus|[A-Z][a-z]{3,12})["\']', res.text)
            for vn in set(voice_names):
                # Filter out standard keywords
                if vn not in ['Flow', 'Google', 'Project', 'Media', 'Image', 'Video', 'Audio', 'Canvas', 'Action', 'Button', 'Cancel', 'Delete', 'Create', 'Update', 'Remove', 'Select', 'Upload', 'Error', 'State', 'Props', 'Component', 'Styles', 'Target', 'Source', 'Output', 'Input', 'Result', 'Values', 'Status', 'Option', 'Options', 'Active', 'Default', 'Custom', 'Preset', 'Library', 'Search', 'Filter', 'Layout', 'Header', 'Footer', 'Dialog', 'Modal', 'Drawer', 'Portal', 'Tooltip', 'Popover', 'Overlay', 'Backdrop']:
                    all_speaker_strings.add(f'{vn} (in {c})')
    except Exception as e:
        pass

print('\n=== ALL DETECTED SPEAKER STRINGS ===')
for s in sorted(all_speaker_strings):
    print(' ', s)

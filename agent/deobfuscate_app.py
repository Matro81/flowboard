import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=30.0)
url = 'https://labs.google/fx/_next/static/chunks/pages/_app-8a4db99aeb18b88b.js'
res = client.get(url)

# The string array is defined near the top or bottom
# Search for array of strings: e.g. ["...", "..."] with length > 500
matches = re.findall(r'(\[(?:\s*[\'"][^\'"]*[\'"]\s*,?){100,}\])', res.text)
print('Long array matches:', len(matches))
if matches:
    print('First array length:', len(matches[0]))
    # Let's search inside this array for all voice names / character voice presets
    # Gemini / Cloud TTS / Google Flow voice presets:
    words = re.findall(r'[\'"]([a-zA-Z0-9_\-\s\.\:\/]{2,50})[\'"]', matches[0])
    print(f'Total words in array: {len(words)}')
    # Let's search for voice/sound related words
    voice_words = [w for w in set(words) if any(k in w.lower() for k in ['voice', 'sound', 'audio', 'speaker', 'character', 'dialog'])]
    print('\nVoice-related in table:')
    for vw in sorted(voice_words):
        print(' ', vw)
        
    # Also find proper names (Capitalized words of 3-12 letters)
    names = [w for w in set(words) if re.match(r'^[A-Z][a-z]{2,12}$', w)]
    print('\nCandidate Voice Names in string table:')
    for n in sorted(names):
        print(' ', n)

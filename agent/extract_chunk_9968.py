import httpx
import re

client = httpx.Client(headers={'User-Agent': 'Mozilla/5.0'}, timeout=20.0)
url = 'https://labs.google/fx/_next/static/chunks/9968-405b3af5cbf6c1ea.js'
res = client.get(url)

print('Status:', res.status_code, 'Len:', len(res.text))

# Let's find all string literals in the chunk
strings = re.findall(r'["\']([a-zA-Z0-9_\-\s\.\:]{2,50})["\']', res.text)
print('Total strings:', len(strings))

# Let's find any string table / hex decoder table at the top of the file
# e.g. function _0x...() { var _0x... = ['...', '...']; ... }
array_match = re.search(r'function\s+([a-zA-Z0-9_]+)\s*\(\)\s*\{\s*var\s+[a-zA-Z0-9_]+\s*=\s*(\[[^\]]+\]);', res.text)
if array_match:
    print('Found string table!')
    raw_array = array_match.group(2)
    # Extract all strings in string table
    table_strings = re.findall(r'["\']([^"\']+)["\']', raw_array)
    print(f'Table contains {len(table_strings)} strings')
    # Print strings that look like voices or names or audio
    for s in table_strings:
        if any(x in s.lower() for x in ['voice', 'speaker', 'audio', 'sound', 'female', 'male', 'sample', 'preset']):
            print('  Table string:', s)
else:
    print('No standard string table found, searching regex...')

# Search for any list of names or speaker IDs
names = re.findall(r'["\']([A-Z][a-z]+)[\'"]', res.text)
candidates = [n for n in set(names) if len(n) > 3 and not n.startswith(('Get', 'Set', 'Use', 'Has', 'Can', 'Will', 'With', 'From', 'This', 'That', 'Then', 'When', 'What', 'Where', 'Which', 'Null', 'True', 'False', 'Undefined', 'Error'))]
print('Capitalized name candidates:', sorted(candidates))

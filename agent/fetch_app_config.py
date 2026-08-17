import httpx
import json

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Origin': 'https://labs.google',
    'Referer': 'https://labs.google/fx/tools/flow',
}

client = httpx.Client(headers=headers, timeout=20.0)

# Flow public API key
api_key = 'AIzaSyBtrm0o5ab1c-Ec8ZuLcGt3oJAA5VWt3pY'

urls = [
    f'https://aisandbox-pa.googleapis.com/v1/flow/appConfig?key={api_key}',
    f'https://aisandbox-pa.googleapis.com/v1/flow/appConfig',
    f'https://aisandbox-pa.googleapis.com/v1/flow/models/statuses?key={api_key}',
]

for url in urls:
    try:
        res = client.get(url)
        print('URL:', url)
        print('Status:', res.status_code)
        if res.status_code == 200:
            data = res.json()
            print('Keys:', list(data.keys()) if isinstance(data, dict) else len(data))
            # Search for voices or audio in response
            text = json.dumps(data, indent=2)
            for word in ['voice', 'audio', 'preset', 'speaker']:
                if word in text.lower():
                    print(f'Found "{word}" in response!')
            with open('app_config_dump.json', 'w', encoding='utf-8') as f:
                f.write(text)
            print('Dumped response to app_config_dump.json')
    except Exception as e:
        print('Error:', e)

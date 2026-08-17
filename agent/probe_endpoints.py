import httpx
import json
import urllib.parse

endpoints = [
    '/v1/flow/appConfig',
    '/v1/flow/models/statuses',
    '/v1/flow/entities',
    '/v1/flow/likeness:listUserLikenesses',
    '/v1/flow/userSettings',
    '/v1/flowMedia:listPresets',
    '/v1/flowCollections/',
    '/v1/flowWorkflows/',
]

for ep in endpoints:
    url = 'http://127.0.0.1:8101/api/flow/voices/discover?path=' + urllib.parse.quote(ep)
    try:
        r = httpx.get(url, timeout=15.0)
        res = r.json()
        print(f'EP: {ep} -> Status: {res.get("status")}, Error: {res.get("error")}')
        if res.get('data'):
            keys = list(res['data'].keys()) if isinstance(res['data'], dict) else len(res['data'])
            print(f'   Data keys/len: {keys}')
            # Save data
            safe_name = ep.replace('/', '_').replace(':', '_') + '.json'
            with open(safe_name, 'w', encoding='utf-8') as f:
                json.dump(res['data'], f, indent=2)
    except Exception as e:
        print(f'EP {ep} exception:', e)

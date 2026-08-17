import asyncio
import json
from flowboard.services.flow_client import flow_client

async def main():
    print('Testing flow_client connection...')
    try:
        # Check if flow_client is connected
        res = await flow_client.api_request(
            url='https://aisandbox-pa.googleapis.com/v1/flow/appConfig',
            method='GET',
            timeout=15.0
        )
        print('Status:', res.get('status'))
        print('Error:', res.get('error'))
        if res.get('data'):
            with open('real_app_config.json', 'w', encoding='utf-8') as f:
                json.dump(res['data'], f, indent=2)
            print('Successfully saved real_app_config.json!')
            # Search for voices
            text = json.dumps(res['data'])
            print('Response length:', len(text))
            for word in ['voice', 'speaker', 'audio', 'preset', 'presetVoiceId']:
                if word in text.lower():
                    print(f'Found "{word}" in real config!')
    except Exception as e:
        print('Exception:', e)

asyncio.run(main())

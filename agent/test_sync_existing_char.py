import httpx
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

payload = {
    "project_id": "044feaec-b70a-46ee-b3e1-2178eceb67cd",
    "entity_id": "9b7c55e5-128a-4a3c-a20e-2aa19d03b039",
    "display_name": "Vietnamese Silk Tea Model",
    "portrait_media_id": "b1866d4b-9de1-47a2-a261-a83b006f83f9",
    "turnaround_media_id": "28a6348b-a246-43c7-9434-005b3221fa9d",
    "voice_name": "Aoede",
    "personality_notes": "Vietnamese female model, graceful and elegant, holding silk tea box"
}

r = httpx.post("http://127.0.0.1:8101/api/flow/projects/characters/sync", json=payload, timeout=30.0)
print("Status:", r.status_code)
print("Response:", json.dumps(r.json(), indent=2, ensure_ascii=False))

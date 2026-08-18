import httpx
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

project_id = "044feaec-b70a-46ee-b3e1-2178eceb67cd"
entity_id = "9b7c55e5-128a-4a3c-a20e-2aa19d03b039"

payload = {
    "project_id": project_id,
    "entity_id": entity_id,
    "display_name": "Lan Vietnamese Model",
    "portrait_media_id": "4c55337b-2a16-4be3-a9c6-e62bc32828de", # Real workflowId 1
    "turnaround_media_id": "72be57f9-7999-4259-948b-061f06a48bd3", # Real workflowId 2
    "voice_name": "Aoede",
    "personality_notes": "Graceful Vietnamese female model, holding silk tea box"
}

r = httpx.post("http://127.0.0.1:8101/api/flow/projects/characters/sync", json=payload, timeout=30.0)
print("Status:", r.status_code)
print("Response:", json.dumps(r.json(), indent=2, ensure_ascii=False))

import httpx
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

project_id = "044feaec-b70a-46ee-b3e1-2178eceb67cd"
entity_id = "9b7c55e5-128a-4a3c-a20e-2aa19d03b039"
url = "http://127.0.0.1:8101/api/flow/projects/characters/sync"

tests = [
    ("A_name_only", {
        "project_id": project_id,
        "entity_id": entity_id,
        "display_name": "Lan Vietnamese Model",
    }),
    ("B_name_and_notes", {
        "project_id": project_id,
        "entity_id": entity_id,
        "display_name": "Lan Vietnamese Model",
        "personality_notes": "Graceful Vietnamese female model",
    }),
    ("C_name_and_voice", {
        "project_id": project_id,
        "entity_id": entity_id,
        "display_name": "Lan Vietnamese Model",
        "voice_name": "Aoede",
    }),
    ("D_name_and_portrait", {
        "project_id": project_id,
        "entity_id": entity_id,
        "display_name": "Lan Vietnamese Model",
        "portrait_media_id": "b1866d4b-9de1-47a2-a261-a83b006f83f9",
    }),
    ("E_name_and_turnaround", {
        "project_id": project_id,
        "entity_id": entity_id,
        "display_name": "Lan Vietnamese Model",
        "turnaround_media_id": "28a6348b-a246-43c7-9434-005b3221fa9d",
    }),
    ("F_all_combined", {
        "project_id": project_id,
        "entity_id": entity_id,
        "display_name": "Lan Vietnamese Model",
        "portrait_media_id": "b1866d4b-9de1-47a2-a261-a83b006f83f9",
        "turnaround_media_id": "28a6348b-a246-43c7-9434-005b3221fa9d",
        "voice_name": "Aoede",
        "personality_notes": "Graceful Vietnamese female model",
    }),
]

for name, payload in tests:
    print(f"\n--- Running {name} ---")
    try:
        r = httpx.post(url, json=payload, timeout=20.0)
        print(f"Status: {r.status_code}")
        print("Response:", r.text[:300])
    except Exception as e:
        print("Error:", e)

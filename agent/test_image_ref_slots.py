import httpx
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

# Let's test calling flow_client directly for different imageReferences
from flowboard.services.flow_client import flow_client
import asyncio

async def test():
    project_id = "044feaec-b70a-46ee-b3e1-2178eceb67cd"
    entity_id = "9b7c55e5-128a-4a3c-a20e-2aa19d03b039"
    
    tests = [
        ("empty_array", []),
        ("one_empty_dict", [{}]),
        ("two_empty_dicts", [{}, {}]),
        ("two_slots_with_wf", [{"workflowId": "4c55337b-2a16-4be3-a9c6-e62bc32828de"}, {}]),
    ]
    
    for label, refs in tests:
        print(f"\n--- Testing {label} ---")
        r = await flow_client.api_request(
            url="https://aisandbox-pa.googleapis.com/v1/flow/entities",
            method="PATCH",
            body={
                "entity": {
                    "projectId": project_id,
                    "entityId": entity_id,
                    "entityInfo": {
                        "displayName": "Lan Vietnamese Model",
                        "characterInfo": {
                            "imageReferences": refs
                        }
                    }
                },
                "updateMask": "entityInfo.displayName,entityInfo.characterInfo.imageReferences"
            }
        )
        print("Result:", json.dumps(r, indent=2, ensure_ascii=False))

asyncio.run(test())

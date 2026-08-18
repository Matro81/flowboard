import httpx
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

from flowboard.services.flow_client import flow_client
import asyncio

async def test_fields():
    project_id = "044feaec-b70a-46ee-b3e1-2178eceb67cd"
    entity_id = "9b7c55e5-128a-4a3c-a20e-2aa19d03b039"
    
    # Test 1: Only displayName
    print("\n--- TEST 1: Only displayName ---")
    r1 = await flow_client.api_request(
        url="https://aisandbox-pa.googleapis.com/v1/flow/entities",
        method="PATCH",
        body={
            "entity": {
                "projectId": project_id,
                "entityId": entity_id,
                "entityInfo": {
                    "displayName": "Lan Vietnamese Model"
                }
            },
            "updateMask": "entityInfo.displayName"
        }
    )
    print("Test 1 Result:", json.dumps(r1, indent=2, ensure_ascii=False))

    # Test 2: displayName + personalityNotes
    print("\n--- TEST 2: displayName + personalityNotes ---")
    r2 = await flow_client.api_request(
        url="https://aisandbox-pa.googleapis.com/v1/flow/entities",
        method="PATCH",
        body={
            "entity": {
                "projectId": project_id,
                "entityId": entity_id,
                "entityInfo": {
                    "displayName": "Lan Vietnamese Model",
                    "characterInfo": {
                        "personalityNotes": "Graceful Vietnamese female model"
                    }
                }
            },
            "updateMask": "entityInfo.displayName,entityInfo.characterInfo.personalityNotes"
        }
    )
    print("Test 2 Result:", json.dumps(r2, indent=2, ensure_ascii=False))

    # Test 3: audioReferences
    print("\n--- TEST 3: audioReferences ---")
    r3 = await flow_client.api_request(
        url="https://aisandbox-pa.googleapis.com/v1/flow/entities",
        method="PATCH",
        body={
            "entity": {
                "projectId": project_id,
                "entityId": entity_id,
                "entityInfo": {
                    "characterInfo": {
                        "audioReferences": [{"presetVoiceId": "Aoede"}]
                    }
                }
            },
            "updateMask": "entityInfo.characterInfo.audioReferences"
        }
    )
    print("Test 3 Result:", json.dumps(r3, indent=2, ensure_ascii=False))

    # Test 4: imageReferences with workflowId
    print("\n--- TEST 4: imageReferences with workflowId ---")
    r4 = await flow_client.api_request(
        url="https://aisandbox-pa.googleapis.com/v1/flow/entities",
        method="PATCH",
        body={
            "entity": {
                "projectId": project_id,
                "entityId": entity_id,
                "entityInfo": {
                    "characterInfo": {
                        "imageReferences": [
                            {"workflowId": "4c55337b-2a16-4be3-a9c6-e62bc32828de"},
                            {"workflowId": "72be57f9-7999-4259-948b-061f06a48bd3"}
                        ]
                    }
                }
            },
            "updateMask": "entityInfo.characterInfo.imageReferences"
        }
    )
    print("Test 4 Result:", json.dumps(r4, indent=2, ensure_ascii=False))

asyncio.run(test_fields())

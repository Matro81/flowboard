import pytest
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient
from flowboard.main import app
from flowboard.services.flow_sdk import FlowSDK

client = TestClient(app)

@pytest.mark.asyncio
async def test_sdk_sync_flow_character_entity_existing():
    mock_client = AsyncMock()
    
    # Handle copyProjectMedia returning workflow.name and PATCH returning SUCCESS
    def side_effect_api(url, method, headers=None, body=None):
        if "copyProjectMedia" in url:
            slot = body.get("destinationMediaContext", {}).get("entityContext", {}).get("characterSlot", {}).get("imageReferenceIndex", 0)
            return {"data": {"workflow": {"name": f"wf-copied-slot-{slot}"}}}
        return {"status": "SUCCESS"}
        
    mock_client.api_request.side_effect = side_effect_api
    
    sdk = FlowSDK(client=mock_client)
    res = await sdk.sync_flow_character_entity(
        project_id="test-proj-123",
        entity_id="test-ent-456",
        display_name="Lan",
        portrait_media_id="media-headshot-1",
        turnaround_media_id="media-turnaround-2",
        voice_name="Aoede",
        personality_notes="Friendly and energetic",
    )
    
    assert res["entity_id"] == "test-ent-456"
    assert res["display_name"] == "Lan"
    assert "character/test-ent-456" in res["url"]
    
    # 2 copyProjectMedia calls (slot 0, slot 1) + 1 PATCH call
    assert mock_client.api_request.call_count == 3
    patch_call = mock_client.api_request.call_args_list[-1][1]
    assert patch_call["url"] == "https://aisandbox-pa.googleapis.com/v1/flow/entities"
    assert patch_call["method"] == "PATCH"
    
    body = patch_call["body"]
    assert body["entity"]["projectId"] == "test-proj-123"
    assert body["entity"]["entityId"] == "test-ent-456"
    assert body["entity"]["entityInfo"]["displayName"] == "Lan"
    assert body["entity"]["entityInfo"]["characterInfo"]["imageReferences"] == [
        {"workflowId": "wf-copied-slot-0"},
        {"workflowId": "wf-copied-slot-1"}
    ]
    assert body["entity"]["entityInfo"]["characterInfo"]["audioReferences"][0]["presetVoiceId"] == "Aoede"


@pytest.mark.asyncio
async def test_sdk_sync_flow_character_entity_mint_new():
    mock_client = AsyncMock()
    # TRPC flow.createEntity returns nested entityId
    mock_client.trpc_request.return_value = {
        "status": 200,
        "data": {
            "result": {
                "data": {
                    "json": {
                        "projectId": "test-proj-123",
                        "entityId": "minted-char-uuid-789",
                        "entityInfo": {
                            "entityType": "CHARACTER",
                            "displayName": "Lan",
                        }
                    }
                }
            }
        }
    }
    
    def side_effect_api(url, method, headers=None, body=None):
        if "copyProjectMedia" in url:
            return {"data": {"workflow": {"name": "wf-copied-slot-0"}}}
        return {"status": "SUCCESS"}
        
    mock_client.api_request.side_effect = side_effect_api
    
    sdk = FlowSDK(client=mock_client)
    res = await sdk.sync_flow_character_entity(
        project_id="test-proj-123",
        entity_id=None,  # No entity_id -> mint new
        display_name="Lan",
        portrait_media_id="media-headshot-1",
        voice_name="Zephyr",
    )
    
    assert res["entity_id"] == "minted-char-uuid-789"
    assert res["display_name"] == "Lan"
    assert "character/minted-char-uuid-789" in res["url"]
    
    mock_client.trpc_request.assert_called_once()
    trpc_kwargs = mock_client.trpc_request.call_args[1]
    assert trpc_kwargs["url"] == "https://labs.google/fx/api/trpc/flow.createEntity"
    assert trpc_kwargs["body"]["json"]["projectId"] == "test-proj-123"
    
    # 1 copyProjectMedia (slot 0) + 1 PATCH
    assert mock_client.api_request.call_count == 2
    patch_call = mock_client.api_request.call_args_list[-1][1]
    assert patch_call["body"]["entity"]["entityId"] == "minted-char-uuid-789"
    assert patch_call["body"]["entity"]["entityInfo"]["characterInfo"]["imageReferences"] == [
        {"workflowId": "wf-copied-slot-0"}
    ]

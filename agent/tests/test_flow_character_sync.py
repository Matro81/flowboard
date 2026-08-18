import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from flowboard.main import app
from flowboard.services.flow_sdk import FlowSDK

client = TestClient(app)

@pytest.mark.asyncio
async def test_sdk_sync_flow_character_entity():
    mock_client = AsyncMock()
    mock_client.api_request.return_value = {"status": "SUCCESS"}
    
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
    
    mock_client.api_request.assert_called_once()
    call_args = mock_client.api_request.call_args[1]
    assert call_args["url"] == "https://aisandbox-pa.googleapis.com/v1/flow/entities"
    assert call_args["method"] == "PATCH"
    
    body = call_args["body"]
    assert body["entity"]["projectId"] == "test-proj-123"
    assert body["entity"]["entityId"] == "test-ent-456"
    assert body["entity"]["entityInfo"]["displayName"] == "Lan"
    assert len(body["entity"]["entityInfo"]["characterInfo"]["imageReferences"]) == 2
    assert body["entity"]["entityInfo"]["characterInfo"]["audioReferences"][0]["presetVoiceId"] == "Aoede"

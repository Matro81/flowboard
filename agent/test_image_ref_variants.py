import httpx
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

# We can test calling PATCH /v1/flow/entities with various imageReferences structures directly via flow_client through the API
# Let's create a test endpoint in Python
project_id = "044feaec-b70a-46ee-b3e1-2178eceb67cd"
entity_id = "9b7c55e5-128a-4a3c-a20e-2aa19d03b039"

real_workflow_id = "4c55337b-2a16-4be3-a9c6-e62bc32828de"
real_media_id = "b1866d4b-9de1-47a2-a261-a83b006f83f9"

variants = [
    ("1_workflowId_real", [{"workflowId": real_workflow_id}]),
    ("2_mediaId_real", [{"mediaId": real_media_id}]),
    ("3_imageId_real", [{"imageId": real_media_id}]),
    ("4_both_workflowId_mediaId", [{"workflowId": real_workflow_id, "mediaId": real_media_id}]),
    ("5_empty_obj_slot", [{"workflowId": real_workflow_id}, {}]),
]

print("Ready to test variants")

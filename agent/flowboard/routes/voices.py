from fastapi import APIRouter

from flowboard.services.flow_client import flow_client
from flowboard.services.flow_voices import list_flow_voices

router = APIRouter(prefix="/api/flow/voices", tags=["voices"])


@router.get("")
def get_voices():
    """Returns the list of available Google Flow voice profiles."""
    return list_flow_voices()


@router.get("/discover")
async def discover_voices(path: str = "/v1/flow/appConfig"):
    """Fetch live appConfig and voice definitions from Google Flow."""
    try:
        url = f"https://aisandbox-pa.googleapis.com{path}" if path.startswith("/") else path
        res = await flow_client.api_request(
            url=url,
            method="GET",
            timeout=20.0,
        )
        return {"status": res.get("status"), "data": res.get("data"), "error": res.get("error")}
    except Exception as e:
        return {"error": str(e)}

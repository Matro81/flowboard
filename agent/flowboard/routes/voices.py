"""API route for Google Flow Voice profiles."""
from __future__ import annotations

from fastapi import APIRouter

from flowboard.services.flow_voices import list_flow_voices

router = APIRouter(prefix="/api/flow/voices", tags=["voices"])


@router.get("")
def get_voices():
    """Returns the list of available Google Flow voice profiles."""
    return list_flow_voices()

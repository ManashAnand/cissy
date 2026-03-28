"""POST /query — conversational BI turn (persists messages; NL→SQL stub)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.db.duckdb import get_duckdb
from app.models.pydantic.conversation import QueryTurnBody, QueryTurnResponse
from app.services import conversation_service

router = APIRouter()

_STUB_INSIGHT = (
    "Message recorded. NL→SQL and chart generation will be connected in a later step."
)


@router.post("/query", response_model=QueryTurnResponse)
def query_turn(body: QueryTurnBody, conn=Depends(get_duckdb)) -> QueryTurnResponse:
    """
    One user turn: optionally continues an existing conversation via job_id / conversationId.
    If job_id is omitted, creates a new conversation (Option A from job_id_usage.md).
    """
    text = body.message.strip()
    if not text:
        raise HTTPException(status_code=400, detail="message must not be empty")

    if body.job_id is None:
        conv = conversation_service.create_conversation(conn, label=None)
        job_id_str = conv["job_id"]
    else:
        job_id_str = str(body.job_id)
        if not conversation_service.conversation_exists(conn, job_id_str):
            raise HTTPException(
                status_code=404,
                detail=f"Unknown job_id: {job_id_str}",
            )

    conversation_service.append_message(conn, job_id_str, "user", text)
    conversation_service.append_message(
        conn,
        job_id_str,
        "assistant",
        _STUB_INSIGHT,
        meta={"stub": True},
    )

    return QueryTurnResponse(
        job_id=job_id_str,
        sql=None,
        columns=[],
        rows=[],
        chart=None,
        insight=_STUB_INSIGHT,
        error=None,
    )

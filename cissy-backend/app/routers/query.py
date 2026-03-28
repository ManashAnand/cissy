"""POST /query — conversational BI turn (NL→SQL when OPENAI_API_KEY is set)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.db.duckdb import get_duckdb
from app.models.pydantic.conversation import ColumnSpec, QueryTurnBody, QueryTurnResponse
from app.services import bi_nl_orchestrator, conversation_service

router = APIRouter()


@router.post("/query", response_model=QueryTurnResponse)
def query_turn(body: QueryTurnBody, conn=Depends(get_duckdb)) -> QueryTurnResponse:
    """
    One user turn: optionally continues an existing conversation via job_id / conversationId.
    If job_id is omitted, creates a new conversation (Option A from job_id_usage.md).

    When **OPENAI_API_KEY** is configured, runs **NL→SQL→DuckDB** and returns table + chart + insight.
    Otherwise returns a clear message asking to configure the key.
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

    result = bi_nl_orchestrator.run_bi_nl_turn(conn, job_id_str, text)

    assistant_text = (result.get("insight") or "No summary available.").strip()
    meta: dict[str, Any] = {
        "sql": result.get("sql"),
        "error": result.get("error"),
        "chart": result.get("chart"),
        "row_count": len(result.get("rows") or []),
    }
    conversation_service.append_message(
        conn,
        job_id_str,
        "assistant",
        assistant_text,
        meta=meta,
    )

    columns_raw = result.get("columns") or []
    columns = [
        ColumnSpec(name=c.get("name", ""), type=c.get("type", "") or "")
        for c in columns_raw
    ]

    return QueryTurnResponse(
        job_id=job_id_str,
        sql=result.get("sql"),
        columns=columns,
        rows=result.get("rows") or [],
        chart=result.get("chart"),
        insight=result.get("insight"),
        error=result.get("error"),
    )

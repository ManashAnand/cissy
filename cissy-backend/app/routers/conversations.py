"""Conversation list, create, and message history — scoped by job_id (UUID)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Response

from app.db.duckdb import get_duckdb
from app.models.pydantic.conversation import (
    ConversationCreateBody,
    ConversationCreatedResponse,
    ConversationListItem,
    ConversationsListResponse,
    MessageItem,
    MessagesListResponse,
)
from app.services import conversation_service

router = APIRouter()


@router.get("/conversations", response_model=ConversationsListResponse)
def list_conversations(conn=Depends(get_duckdb)) -> ConversationsListResponse:
    rows = conversation_service.list_conversations(conn)
    return ConversationsListResponse(
        conversations=[ConversationListItem(**r) for r in rows]
    )


@router.post("/conversations", response_model=ConversationCreatedResponse)
def create_conversation(
    body: ConversationCreateBody | None = Body(None),
    conn=Depends(get_duckdb),
) -> ConversationCreatedResponse:
    label = body.label if body else None
    row = conversation_service.create_conversation(conn, label=label)
    return ConversationCreatedResponse(
        job_id=row["job_id"],
        label=row["label"],
        created_at=row["created_at"],
    )


@router.delete("/conversations/{job_id}", status_code=204)
def delete_conversation(job_id: UUID, conn=Depends(get_duckdb)) -> Response:
    """Delete a conversation (dashboard card) and all of its messages."""
    sid = str(job_id)
    if not conversation_service.delete_conversation(conn, sid):
        raise HTTPException(
            status_code=404,
            detail=f"Unknown job_id: {sid}",
        )
    return Response(status_code=204)


@router.get("/conversations/{job_id}/messages", response_model=MessagesListResponse)
def get_messages(job_id: UUID, conn=Depends(get_duckdb)) -> MessagesListResponse:
    sid = str(job_id)
    if not conversation_service.conversation_exists(conn, sid):
        raise HTTPException(
            status_code=404,
            detail=f"Unknown job_id: {sid}",
        )
    rows = conversation_service.get_messages(conn, sid)
    return MessagesListResponse(
        messages=[MessageItem(**m) for m in rows],
    )

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ConversationCreateBody(BaseModel):
    label: str | None = Field(None, description="Optional title")


class ConversationCreatedResponse(BaseModel):
    """Matches dashboard-apis.md `CreateConversationResponse`."""

    job_id: str
    label: str | None = None
    created_at: str | None = None


class ConversationListItem(BaseModel):
    """Matches dashboard-apis.md `ConversationSummary`."""

    job_id: str
    label: str | None = None
    updated_at: str
    created_at: str


class ConversationsListResponse(BaseModel):
    conversations: list[ConversationListItem]


class MessageItem(BaseModel):
    id: str
    job_id: str
    role: str
    content: str
    created_at: str
    meta: dict[str, Any] | None = None


class MessagesListResponse(BaseModel):
    messages: list[MessageItem]


class ColumnSpec(BaseModel):
    """Column descriptor for query results (matches job_id_usage contract)."""

    name: str
    type: str = ""


class QueryTurnBody(BaseModel):
    """POST /query — natural-language turn (NL→SQL wired later)."""

    model_config = ConfigDict(populate_by_name=True)

    message: str = Field(..., min_length=1)
    job_id: UUID | None = None
    conversation_id: UUID | None = Field(
        default=None,
        alias="conversationId",
        description="Alias for job_id (frontend compatibility)",
    )

    @model_validator(mode="after")
    def resolve_job_id(self) -> QueryTurnBody:
        if self.job_id is None and self.conversation_id is not None:
            object.__setattr__(self, "job_id", self.conversation_id)
        return self


class QueryTurnResponse(BaseModel):
    job_id: str
    sql: str | None = None
    columns: list[ColumnSpec] = Field(default_factory=list)
    rows: list[list[Any]] = Field(default_factory=list)
    chart: dict[str, Any] | None = None
    insight: str | None = None
    error: str | None = None

"""Dashboard payload: stats cards + per-job project cards (see markdown/dashboard-design.md)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class DashboardStatCard(BaseModel):
    """One summary metric (matches stats row in dashboard-design)."""

    key: str = Field(
        ...,
        description="Stable id: total_projects | documents_processed | average_processing_time | pending_analysis",
    )
    label: str
    main_value: str
    subtext: str = ""
    status_chip: str | None = Field(
        None, description="Optional chip: active | pending | …"
    )


class DashboardStatsBlock(BaseModel):
    total_projects: DashboardStatCard
    documents_processed: DashboardStatCard
    average_processing_time: DashboardStatCard
    pending_analysis: DashboardStatCard


class DashboardProjectCard(BaseModel):
    """
    One row in “Your projects” — keyed by job_id (same as conversations.id).
    Includes fields for the card + info popover (job type, created).
    """

    job_id: str
    status: str = "active"
    title: str = Field(..., description="Project / analysis type label on the card")
    company_name: str | None = None
    file_count: int = 0
    last_updated: str = Field(..., description="ISO-like timestamp string")
    last_updated_relative: str = Field(
        default="",
        description="Human-readable relative time for display",
    )
    launch_readiness: str = "not_ready"
    list_label: str = Field(
        default="New chat",
        description="Sidebar / list title (conversation label)",
    )
    created_at: str = ""
    job_type: str = Field(
        default="BI Analysis",
        description="Same as title for popover ‘Type’ field",
    )


class DashboardResponse(BaseModel):
    """Full dashboard: aggregate stats, all project cards, and job_ids for reference."""

    stats: DashboardStatsBlock
    projects: list[DashboardProjectCard]
    job_ids: list[str] = Field(
        ...,
        description="All conversation job_ids (same order as projects)",
    )

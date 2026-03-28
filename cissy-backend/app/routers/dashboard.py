"""Dashboard aggregate stats + per job_id project cards."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.db.duckdb import get_duckdb
from app.models.pydantic.dashboard import (
    DashboardProjectCard,
    DashboardResponse,
    DashboardStatCard,
    DashboardStatsBlock,
)
from app.services import dashboard_service

router = APIRouter()


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(conn=Depends(get_duckdb)) -> DashboardResponse:
    """
    Single payload for the analyst dashboard: four stat cards, every project row keyed by **job_id**,
    and a **job_ids** list for quick reference (same order as **projects**).
    """
    raw = dashboard_service.build_dashboard(conn)
    s = raw["stats"]
    stats = DashboardStatsBlock(
        total_projects=DashboardStatCard(**s["total_projects"]),
        documents_processed=DashboardStatCard(**s["documents_processed"]),
        average_processing_time=DashboardStatCard(**s["average_processing_time"]),
        pending_analysis=DashboardStatCard(**s["pending_analysis"]),
    )
    projects = [DashboardProjectCard(**p) for p in raw["projects"]]
    return DashboardResponse(
        stats=stats,
        projects=projects,
        job_ids=raw["job_ids"],
    )

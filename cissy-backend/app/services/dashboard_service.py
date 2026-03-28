"""Aggregate dashboard stats and per-job project cards (job_id) for the BI dashboard UI."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from duckdb import DuckDBPyConnection

from app.utils.datetime_fmt import iso8601_utc_z


def _relative_english(ts: datetime | Any) -> str:
    if ts is None:
        return ""
    if not hasattr(ts, "replace"):
        return ""
    dt = ts
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    now = datetime.now(UTC)
    sec = int((now - dt).total_seconds())
    if sec < 60:
        return "just now"
    if sec < 3600:
        m = sec // 60
        return f"about {m} minute{'s' if m != 1 else ''} ago"
    if sec < 86400:
        h = sec // 3600
        return f"about {h} hour{'s' if h != 1 else ''} ago"
    d = sec // 86400
    return f"about {d} day{'s' if d != 1 else ''} ago"


def build_dashboard(conn: DuckDBPyConnection) -> dict[str, Any]:
    """
    Return stats (four summary cards) + one project card per conversation (job_id),
    plus a flat job_ids list for quick reference.
    """
    total = conn.execute("SELECT COUNT(*) FROM conversations").fetchone()
    total_n = int(total[0]) if total else 0

    completed_row = conn.execute(
        """
        SELECT COUNT(*) FROM conversations
        WHERE LOWER(COALESCE(status, '')) = 'completed'
        """
    ).fetchone()
    completed_n = int(completed_row[0]) if completed_row else 0

    sum_files = conn.execute(
        "SELECT COALESCE(SUM(file_count), 0) FROM conversations"
    ).fetchone()
    docs_n = int(sum_files[0]) if sum_files else 0

    pending_row = conn.execute(
        """
        SELECT COUNT(*) FROM conversations
        WHERE LOWER(COALESCE(status, 'active')) NOT IN ('completed')
        """
    ).fetchone()
    pending_n = int(pending_row[0]) if pending_row else 0

    stats = {
        "total_projects": {
            "key": "total_projects",
            "label": "Total Projects",
            "main_value": str(total_n),
            "subtext": f"{completed_n} completed",
            "status_chip": "active" if total_n else None,
        },
        "documents_processed": {
            "key": "documents_processed",
            "label": "Documents Processed",
            "main_value": str(docs_n),
            "subtext": "Files analyzed",
            "status_chip": "active" if docs_n else None,
        },
        "average_processing_time": {
            "key": "average_processing_time",
            "label": "Average Processing Time",
            "main_value": "—",
            "subtext": "Per document",
            "status_chip": None,
        },
        "pending_analysis": {
            "key": "pending_analysis",
            "label": "Pending Analysis",
            "main_value": str(pending_n),
            "subtext": "In progress",
            "status_chip": "pending" if pending_n else None,
        },
    }

    rows = conn.execute(
        """
        SELECT
            id,
            label,
            created_at,
            updated_at,
            COALESCE(status, 'active') AS status,
            COALESCE(project_type, 'BI Analysis') AS project_type,
            company_name,
            COALESCE(file_count, 0) AS file_count,
            COALESCE(launch_readiness, 'not_ready') AS launch_readiness
        FROM conversations
        ORDER BY updated_at DESC
        """
    ).fetchall()

    projects: list[dict[str, Any]] = []
    job_ids: list[str] = []

    for row in rows:
        (
            jid,
            label,
            created_at,
            updated_at,
            status,
            project_type,
            company_name,
            file_count,
            launch_readiness,
        ) = row
        job_ids.append(jid)
        ua = updated_at
        if hasattr(ua, "replace") and ua.tzinfo is None:
            pass
        projects.append(
            {
                "job_id": jid,
                "status": status,
                "title": project_type,
                "company_name": company_name,
                "file_count": int(file_count),
                "last_updated": iso8601_utc_z(ua),
                "last_updated_relative": _relative_english(ua),
                "launch_readiness": launch_readiness,
                "list_label": label or "New chat",
                "created_at": iso8601_utc_z(created_at),
                "job_type": project_type,
            }
        )

    return {"stats": stats, "projects": projects, "job_ids": job_ids}

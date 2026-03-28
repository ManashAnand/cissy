"""Application (non-analytics) tables in DuckDB: conversations and messages keyed by job_id."""

from __future__ import annotations

import logging

from duckdb import DuckDBPyConnection

logger = logging.getLogger(__name__)


def ensure_app_tables(conn: DuckDBPyConnection) -> None:
    """Create chat metadata tables if missing. Separate from Instacart warehouse views."""
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS conversations (
            id VARCHAR PRIMARY KEY,
            label VARCHAR,
            created_at TIMESTAMP,
            updated_at TIMESTAMP,
            parent_conversation_id VARCHAR
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id VARCHAR PRIMARY KEY,
            job_id VARCHAR NOT NULL,
            role VARCHAR NOT NULL,
            content VARCHAR NOT NULL,
            created_at TIMESTAMP,
            meta VARCHAR
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_messages_job_id ON messages(job_id)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at)"
    )
    _ensure_conversation_dashboard_columns(conn)
    logger.info("Application tables (conversations, messages) ensured")


def _conversation_column_names(conn: DuckDBPyConnection) -> set[str]:
    rows = conn.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'main' AND table_name = 'conversations'
        """
    ).fetchall()
    return {str(r[0]).lower() for r in rows}


def _ensure_conversation_dashboard_columns(conn: DuckDBPyConnection) -> None:
    """Add dashboard/card columns to conversations (idempotent)."""
    have = _conversation_column_names(conn)
    # column_sql: name -> ADD COLUMN fragment (no IF NOT EXISTS for older DuckDB)
    additions: dict[str, str] = {
        "status": "VARCHAR DEFAULT 'active'",
        "project_type": "VARCHAR DEFAULT 'BI Analysis'",
        "company_name": "VARCHAR",
        "file_count": "INTEGER DEFAULT 0",
        "launch_readiness": "VARCHAR DEFAULT 'not_ready'",
    }
    for col, typ in additions.items():
        if col.lower() in have:
            continue
        conn.execute(f"ALTER TABLE conversations ADD COLUMN {col} {typ}")
        have.add(col.lower())
    logger.info("Conversation dashboard columns ensured")

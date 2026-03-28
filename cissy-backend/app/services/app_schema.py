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
    logger.info("Application tables (conversations, messages) ensured")

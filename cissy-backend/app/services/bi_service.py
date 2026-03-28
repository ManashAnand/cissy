"""Conversational BI orchestration — NL→SQL, execution, charts (expand later)."""

from __future__ import annotations

from typing import Any

from duckdb import DuckDBPyConnection


def ping_db(conn: DuckDBPyConnection) -> str:
    """Verify DuckDB responds."""
    rows = conn.execute("SELECT 'ok' AS status").fetchall()
    return rows[0][0] if rows else "unknown"


def execute_sql(conn: DuckDBPyConnection, sql: str) -> tuple[list[str], list[tuple[Any, ...]]]:
    """
    Run a read-only SQL statement and return column names and rows.
    Callers should validate SQL before invoking (expand with allowlists later).
    """
    result = conn.execute(sql)
    cols = getattr(result, "columns", None)
    if cols:
        columns = list(cols)
    elif result.description:
        columns = [d[0] for d in result.description]
    else:
        columns = []
    rows = result.fetchall()
    return columns, rows

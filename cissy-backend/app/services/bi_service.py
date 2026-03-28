"""Conversational BI orchestration — NL→SQL, execution, charts (expand later)."""

from __future__ import annotations

import re
from typing import Any

from duckdb import DuckDBPyConnection

_FORBIDDEN = re.compile(
    r"\b(insert|update|delete|drop|create|alter|truncate|attach|detach|copy|pragma|call)\b",
    re.IGNORECASE | re.DOTALL,
)


def validate_safe_select(sql: str) -> None:
    """
    Allow a single read-only statement: SELECT / WITH / EXPLAIN ... SELECT.
    Rejects multiple statements and dangerous keywords.
    """
    raw = sql.strip()
    if not raw:
        raise ValueError("Empty SQL")
    core = raw.rstrip().rstrip(";").strip()
    if ";" in core:
        raise ValueError("Multiple statements are not allowed")
    normalized = re.sub(r"--[^\n]*", "", core)
    normalized = re.sub(r"/\*.*?\*/", "", normalized, flags=re.DOTALL)
    tokens = normalized.split()
    if not tokens:
        raise ValueError("Empty SQL after removing comments")
    first = tokens[0].lower()
    if first not in ("select", "with", "explain"):
        raise ValueError("Only SELECT, WITH, or EXPLAIN queries are allowed")
    # Ignore keywords inside string literals (reduces false positives)
    without_strings = re.sub(r"'[^']*'", "''", normalized)
    if _FORBIDDEN.search(without_strings):
        raise ValueError("Query contains forbidden keywords")


def execute_safe_select(
    conn: DuckDBPyConnection, sql: str
) -> tuple[list[str], list[tuple[Any, ...]]]:
    validate_safe_select(sql)
    return execute_sql(conn, sql)


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


def fetch_schema(conn: DuckDBPyConnection) -> list[dict[str, Any]]:
    """Return main-schema columns for user tables/views (Instacart)."""
    result = conn.execute(
        """
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'main'
        ORDER BY table_name, ordinal_position
        """
    )
    rows = result.fetchall()
    by_table: dict[str, list[dict[str, str]]] = {}
    for table_name, column_name, data_type in rows:
        by_table.setdefault(table_name, []).append(
            {"name": column_name, "data_type": data_type or ""}
        )
    return [
        {"name": t, "columns": cols}
        for t, cols in sorted(by_table.items())
    ]

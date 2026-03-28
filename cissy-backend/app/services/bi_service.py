"""Conversational BI orchestration — NL→SQL, execution, charts (expand later)."""

from __future__ import annotations

import re
from typing import Any

from duckdb import DuckDBPyConnection

from app.services.instacart_dataset import INSTACART_VIEWS

_FORBIDDEN = re.compile(
    r"\b(insert|update|delete|drop|create|alter|truncate|attach|detach|copy|pragma|call)\b",
    re.IGNORECASE | re.DOTALL,
)


ALLOWED_INSTACART_TABLES: frozenset[str] = frozenset(v for v, _ in INSTACART_VIEWS)


def extract_table_names_from_sql(sql: str) -> set[str]:
    """Rough extraction of table names after FROM / JOIN (DuckDB, no sqlglot)."""
    without_strings = re.sub(r"'[^']*'", "''", sql)
    names: set[str] = set()
    for m in re.finditer(
        r"\b(?:FROM|JOIN)\s+(?:\"([^\"]+)\"|([a-zA-Z_][\w]*))",
        without_strings,
        re.IGNORECASE,
    ):
        raw = (m.group(1) or m.group(2) or "").strip()
        if not raw:
            continue
        base = raw.split(".")[-1].strip().lower()
        names.add(base)
    return names


def validate_instacart_tables_only(sql: str) -> None:
    """Ensure SQL only references Instacart view names we expose."""
    refs = extract_table_names_from_sql(sql)
    if not refs:
        return
    bad = refs - ALLOWED_INSTACART_TABLES
    if bad:
        raise ValueError(
            f"SQL references disallowed tables: {sorted(bad)}. "
            f"Allowed: {sorted(ALLOWED_INSTACART_TABLES)}"
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
    validate_instacart_tables_only(sql)
    return execute_sql(conn, sql)


def execute_safe_select_limited(
    conn: DuckDBPyConnection, sql: str, max_rows: int
) -> tuple[list[str], list[tuple[Any, ...]], list[dict[str, str]]]:
    """
    Same as execute_safe_select but caps rows returned (for API payloads).
    Also returns column name + type strings for ColumnSpec.
    """
    validate_safe_select(sql)
    validate_instacart_tables_only(sql)
    result = conn.execute(sql)
    cols = getattr(result, "columns", None)
    if cols:
        column_names = list(cols)
    elif result.description:
        column_names = [d[0] for d in result.description]
    else:
        column_names = []
    type_hints: list[dict[str, str]] = []
    if result.description:
        for d in result.description:
            name = d[0]
            t = d[1] if len(d) > 1 else ""
            type_hints.append({"name": name, "type": str(t) if t is not None else ""})
    else:
        type_hints = [{"name": n, "type": ""} for n in column_names]
    rows = result.fetchall()
    if max_rows > 0 and len(rows) > max_rows:
        rows = rows[:max_rows]
    return column_names, rows, type_hints


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


def fetch_instacart_schema(conn: DuckDBPyConnection) -> list[dict[str, Any]]:
    """Schema for NL→SQL only — Instacart views, not app tables (conversations/messages)."""
    all_tables = fetch_schema(conn)
    allowed = {x.lower() for x in ALLOWED_INSTACART_TABLES}
    return [t for t in all_tables if (t.get("name") or "").lower() in allowed]

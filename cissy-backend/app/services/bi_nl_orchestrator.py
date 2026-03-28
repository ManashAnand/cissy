"""Glue: history + schema → OpenAI SQL → DuckDB → chart hint + insight."""

from __future__ import annotations

import logging
from typing import Any

from duckdb import DuckDBPyConnection

from app.config import settings
from app.services import bi_service, conversation_service
from app.services.bi_nl_openai import generate_insight, generate_sql
from app.services.bi_nl_prompts import format_schema_markdown
from app.services.chart_heuristics import suggest_chart

logger = logging.getLogger(__name__)


def _history_snippet(conn: DuckDBPyConnection, job_id: str) -> str:
    msgs = conversation_service.get_messages(conn, job_id)
    prior = msgs[:-1] if msgs else []
    lines: list[str] = []
    for m in prior[-12:]:
        role = m.get("role", "")
        content = (m.get("content") or "")[:1200]
        lines.append(f"{role}: {content}")
    return "\n".join(lines) if lines else ""


def run_bi_nl_turn(
    conn: DuckDBPyConnection,
    job_id: str,
    user_message: str,
) -> dict[str, Any]:
    """
    Returns a dict compatible with QueryTurnResponse:
    sql, columns (list of {name, type}), rows, chart, insight, error.
    """
    out: dict[str, Any] = {
        "sql": None,
        "columns": [],
        "rows": [],
        "chart": None,
        "insight": None,
        "error": None,
    }

    if not settings.openai_api_key:
        out["insight"] = (
            "NL→SQL is not configured. Set OPENAI_API_KEY in the server environment to ask "
            "questions in plain English against the Instacart dataset."
        )
        return out

    try:
        schema_md = format_schema_markdown(bi_service.fetch_instacart_schema(conn))
        hist = _history_snippet(conn, job_id)
        sql, reasoning = generate_sql(user_message, schema_md, hist)
        col_names, rows, type_hints = bi_service.execute_safe_select_limited(
            conn, sql, settings.bi_nl_max_rows
        )
        columns = [{"name": h["name"], "type": h.get("type", "")} for h in type_hints]
        chart = suggest_chart(col_names, rows)
        insight = generate_insight(
            user_message,
            sql,
            col_names,
            list(rows),
        )
        if reasoning:
            insight = f"{reasoning}\n\n{insight}"

        out["sql"] = sql
        out["columns"] = columns
        out["rows"] = [list(r) for r in rows]
        out["chart"] = chart
        out["insight"] = insight
    except Exception as e:
        logger.exception("NL→SQL pipeline failed")
        out["error"] = str(e)
        out["insight"] = f"Something went wrong while answering: {e}"

    return out

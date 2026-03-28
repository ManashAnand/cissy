"""OpenAI calls for SQL generation and short insights."""

from __future__ import annotations

import json
import logging
from typing import Any

from openai import OpenAI

from app.config import settings
from app.services.bi_nl_prompts import INSTACART_RULES

logger = logging.getLogger(__name__)


def _client() -> OpenAI:
    key = settings.openai_api_key
    if not key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    return OpenAI(api_key=key)


def generate_sql(
    user_message: str,
    schema_markdown: str,
    history_snippet: str,
) -> tuple[str, str]:
    """
    Ask the model for one DuckDB SELECT (or WITH). Returns (sql, short reasoning).
    """
    system = f"""You are a careful analytics engineer. Output a single JSON object with keys:
- "sql": string, one read-only DuckDB SQL query (SELECT or WITH ... SELECT). No comments outside JSON.
- "reasoning": string, one sentence on assumptions (eval_set, unions, LIMIT).

{INSTACART_RULES}

Schema:
{schema_markdown}
"""
    user = f"""Recent conversation (oldest first):
{history_snippet or "(no prior turns)"}

Question:
{user_message}
"""
    client = _client()
    resp = client.chat.completions.create(
        model=settings.bi_nl_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    raw = resp.choices[0].message.content or "{}"
    data = json.loads(raw)
    sql = (data.get("sql") or "").strip()
    reasoning = (data.get("reasoning") or "").strip()
    if not sql:
        raise ValueError("Model returned empty sql")
    return sql, reasoning


def generate_insight(
    user_message: str,
    sql: str,
    column_names: list[str],
    sample_rows: list[tuple[Any, ...]],
    max_sample: int = 8,
) -> str:
    """One short plain-English insight from the question + small result sample."""
    preview = []
    for row in sample_rows[:max_sample]:
        preview.append(list(row))
    payload = {
        "question": user_message,
        "sql": sql,
        "columns": column_names,
        "sample_rows": preview,
    }
    client = _client()
    resp = client.chat.completions.create(
        model=settings.bi_nl_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You summarize query results for a business user. "
                    "2-4 sentences, plain English, no SQL. "
                    "If the sample is empty, say there were no rows and suggest broadening the question."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(payload, default=str),
            },
        ],
        temperature=0.3,
    )
    text = (resp.choices[0].message.content or "").strip()
    return text or "Here are the results for your question."

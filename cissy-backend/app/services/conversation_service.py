"""CRUD for conversations (job_id) and messages — single-tenant v1 (no user_id)."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import Any

from duckdb import DuckDBPyConnection


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def create_conversation(
    conn: DuckDBPyConnection,
    *,
    label: str | None = None,
    parent_conversation_id: str | None = None,
) -> dict[str, Any]:
    job_id = str(uuid.uuid4())
    now = _now()
    title = label.strip() if label and label.strip() else "New chat"
    conn.execute(
        """
        INSERT INTO conversations (id, label, created_at, updated_at, parent_conversation_id)
        VALUES (?, ?, ?, ?, ?)
        """,
        [job_id, title, now, now, parent_conversation_id],
    )
    return {
        "job_id": job_id,
        "label": title,
        "created_at": now.isoformat() + "Z",
        "updated_at": now.isoformat() + "Z",
    }


def conversation_exists(conn: DuckDBPyConnection, job_id: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM conversations WHERE id = ? LIMIT 1",
        [job_id],
    ).fetchone()
    return row is not None


def list_conversations(conn: DuckDBPyConnection) -> list[dict[str, Any]]:
    result = conn.execute(
        """
        SELECT id, label, created_at, updated_at
        FROM conversations
        ORDER BY updated_at DESC
        """
    )
    rows = result.fetchall()
    out: list[dict[str, Any]] = []
    for row in rows:
        cid, label, created_at, updated_at = row
        out.append(
            {
                "job_id": cid,
                "label": label or "New chat",
                "created_at": _iso(created_at),
                "updated_at": _iso(updated_at),
            }
        )
    return out


def _iso(ts: Any) -> str:
    if ts is None:
        return ""
    if hasattr(ts, "isoformat"):
        s = ts.isoformat()
        return s + "Z" if not s.endswith("Z") and "+" not in s else s
    return str(ts)


def append_message(
    conn: DuckDBPyConnection,
    job_id: str,
    role: str,
    content: str,
    *,
    meta: dict[str, Any] | None = None,
) -> str:
    mid = str(uuid.uuid4())
    now = _now()
    meta_s = json.dumps(meta) if meta else None
    conn.execute(
        """
        INSERT INTO messages (id, job_id, role, content, created_at, meta)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        [mid, job_id, role, content, now, meta_s],
    )
    conn.execute(
        "UPDATE conversations SET updated_at = ? WHERE id = ?",
        [now, job_id],
    )
    return mid


def get_messages(conn: DuckDBPyConnection, job_id: str) -> list[dict[str, Any]]:
    result = conn.execute(
        """
        SELECT id, role, content, created_at, meta
        FROM messages
        WHERE job_id = ?
        ORDER BY created_at ASC
        """,
        [job_id],
    )
    rows = result.fetchall()
    out: list[dict[str, Any]] = []
    for row in rows:
        mid, role, content, created_at, meta_s = row
        item: dict[str, Any] = {
            "id": mid,
            "job_id": job_id,
            "role": role,
            "content": content,
            "created_at": _iso(created_at),
        }
        if meta_s:
            try:
                item["meta"] = json.loads(meta_s)
            except json.JSONDecodeError:
                item["meta"] = None
        else:
            item["meta"] = None
        out.append(item)
    return out

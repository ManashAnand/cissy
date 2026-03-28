"""ISO 8601 timestamps for JSON APIs (dashboard / Next.js expect `...000Z`)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any


def iso8601_utc_z(ts: Any) -> str:
    """
    Format a datetime as UTC ISO 8601 with milliseconds and `Z` suffix
    (e.g. `2026-03-28T15:00:00.000Z`), matching dashboard-apis.md / Next.js.
    """
    if ts is None:
        return ""
    if isinstance(ts, str):
        return ts
    if not isinstance(ts, datetime):
        return str(ts)
    dt = ts
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    else:
        dt = dt.astimezone(UTC)
    s = dt.isoformat(timespec="milliseconds")
    if s.endswith("+00:00"):
        return s[:-6] + "Z"
    if s.endswith("Z"):
        return s
    return s + "Z"


def nullable_label(label: Any) -> str | None:
    """Normalize DB label for `ConversationSummary.label: string | null`."""
    if label is None:
        return None
    s = str(label).strip()
    return s if s else None

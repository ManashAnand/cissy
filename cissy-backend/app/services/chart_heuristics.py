"""Pick a simple chart hint from column names + rows (MVP heuristics)."""

from __future__ import annotations

import re
from typing import Any


def _is_numeric(v: Any) -> bool:
    if v is None:
        return False
    if isinstance(v, bool):
        return False
    if isinstance(v, (int, float)):
        return True
    if isinstance(v, str):
        s = v.strip()
        if not s:
            return False
        return bool(re.match(r"^-?\d+(\.\d+)?$", s))
    return False


def suggest_chart(
    column_names: list[str],
    rows: list[tuple[Any, ...]],
) -> dict[str, Any] | None:
    """
    If we have ≥2 columns and ≥1 row, guess bar chart (category + value).
    Line if first column looks date-like and second numeric.

    Also returns **xValues** / **yValues** (parallel arrays) and **dataPoints**
    ``[{ "x", "y" }, ...]`` so the frontend can plot without re-mapping rows.
    """
    if len(column_names) < 2 or not rows:
        return None
    r0 = rows[0]
    if len(r0) < 2:
        return None
    c0, c1 = column_names[0], column_names[1]
    v0, v1 = r0[0], r0[1]

    chart_type = "bar"
    x_key, y_key = c0, c1

    t0 = str(v0) if v0 is not None else ""
    if re.match(r"^\d{4}-\d{2}-\d{2}", t0) or "date" in c0.lower():
        if _is_numeric(v1):
            chart_type = "line"
            x_key, y_key = c0, c1
        else:
            pass
    elif _is_numeric(v1) and not _is_numeric(v0):
        x_key, y_key = c0, c1
        chart_type = "bar"
    elif _is_numeric(v0) and not _is_numeric(v1):
        x_key, y_key = c1, c0
        chart_type = "bar"
    else:
        x_key, y_key = c0, c1
        chart_type = "bar"

    out: dict[str, Any] = {"type": chart_type, "xKey": x_key, "yKey": y_key}
    return _with_series(out, column_names, rows)


def _with_series(
    chart: dict[str, Any],
    column_names: list[str],
    rows: list[tuple[Any, ...]],
) -> dict[str, Any]:
    x_key = chart.get("xKey")
    y_key = chart.get("yKey")
    if not x_key or not y_key:
        return chart
    try:
        xi = column_names.index(str(x_key))
        yi = column_names.index(str(y_key))
    except ValueError:
        return chart
    x_values: list[Any] = []
    y_values: list[Any] = []
    for row in rows:
        if len(row) <= max(xi, yi):
            continue
        x_values.append(row[xi])
        y_values.append(row[yi])
    chart["xValues"] = x_values
    chart["yValues"] = y_values
    chart["dataPoints"] = [
        {"x": x_values[i], "y": y_values[i]} for i in range(len(x_values))
    ]
    return chart

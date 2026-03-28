"""Pick a simple chart hint from column names + rows (heuristics for NL→SQL results)."""

from __future__ import annotations

import re
from typing import Any

# Category + value: use pie when slice count is in this band; otherwise bar (readability).
MIN_PIE_SLICES = 2
MAX_PIE_SLICES = 20


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


def _is_date_like_column(v0: Any, col0_name: str) -> bool:
    t0 = str(v0) if v0 is not None else ""
    return bool(re.match(r"^\d{4}-\d{2}-\d{2}", t0) or "date" in col0_name.lower())


def suggest_chart(
    column_names: list[str],
    rows: list[tuple[Any, ...]],
) -> dict[str, Any] | None:
    """
    Infer chart **type** from the first two result columns and a peek at the first row.

    Types emitted:

    - **line** — time-like first column, numeric second (trend over time).
    - **scatter** — both columns numeric (two measures / correlation-style).
    - **pie** — categorical first (or second after swap), numeric measure, and row count
      between ``MIN_PIE_SLICES`` and ``MAX_PIE_SLICES`` (part-of-whole, few slices).
    - **bar** — category + value with too many categories for pie, or fallback.

    Always adds **xValues** / **yValues** and **dataPoints** ``[{ "x", "y" }, ...]`` for plotting.
    """
    if len(column_names) < 2 or not rows:
        return None
    r0 = rows[0]
    if len(r0) < 2:
        return None
    c0, c1 = column_names[0], column_names[1]
    v0, v1 = r0[0], r0[1]

    x_key, y_key = c0, c1
    chart_type = "bar"

    if _is_date_like_column(v0, c0) and _is_numeric(v1):
        chart_type = "line"
        x_key, y_key = c0, c1
    elif _is_numeric(v0) and _is_numeric(v1):
        chart_type = "scatter"
        x_key, y_key = c0, c1
    elif _is_numeric(v1) and not _is_numeric(v0):
        x_key, y_key = c0, c1
        n = len(rows)
        if MIN_PIE_SLICES <= n <= MAX_PIE_SLICES:
            chart_type = "pie"
        else:
            chart_type = "bar"
    elif _is_numeric(v0) and not _is_numeric(v1):
        x_key, y_key = c1, c0
        n = len(rows)
        if MIN_PIE_SLICES <= n <= MAX_PIE_SLICES:
            chart_type = "pie"
        else:
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

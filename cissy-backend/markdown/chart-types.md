# Chart hints (`POST /api/v1/query` and message `meta`)

The backend adds a **`chart`** object on successful NL→SQL turns. The UI should use **`chart.type`** to choose a visualization. The same payload always includes **`xKey`**, **`yKey`**, **`xValues`**, **`yValues`**, and **`dataPoints`** so you can render without re-joining **`rows`**.

## Where this appears

| Source | Field |
|--------|--------|
| Live turn | `QueryTurnResponse.chart` |
| History | Assistant message `meta.chart` from `GET /api/v1/conversations/{job_id}/messages` |

**Note:** Stored history does not include full `rows`; for old turns you may only have `chart` + `sql` + `row_count` in `meta`. Fresh `/query` responses include full `rows` for tables.

## JSON shape (common to all types)

```json
{
  "type": "bar | line | pie | scatter",
  "xKey": "column_name_for_x",
  "yKey": "column_name_for_y",
  "xValues": [ ... ],
  "yValues": [ ... ],
  "dataPoints": [ { "x": ..., "y": ... }, ... ]
}
```

- **`xValues` / `yValues`**: parallel arrays, same length (after row filtering).
- **`dataPoints`**: `xValues[i]` / `yValues[i]` pairs for chart libraries that prefer an array of points.
- Only the **first two columns** of the SQL result drive the chart; extra columns are ignored for this hint.

## `type` values and when the backend sets them

Heuristics use the **first row** as a sample plus **row count** (for pie).

| `type` | Meaning | Backend rule (summary) |
|--------|---------|-------------------------|
| **`line`** | Trend over time | First column looks like a date (`YYYY-MM-DD…` **or** column name contains `date`), and the second column is numeric. |
| **`scatter`** | Two numeric measures | First **and** second column values in row 0 are numeric. |
| **`pie`** | Part-of-whole, few slices | One column is categorical (non-numeric) and one is numeric; **2 ≤ row count ≤ 20**. |
| **`bar`** | Categories vs values (default) | Category + numeric but **more than 20** rows; or ambiguous pairs; or **fewer than 2** rows for pie (e.g. a single row). |

Pie vs bar: category + value queries with **LIMIT 10**–style results often become **`pie`**; large breakdowns become **`bar`**.

## Frontend mapping (suggested)

| `type` | Suggested component |
|--------|------------------------|
| `bar` | Vertical bar (or horizontal if labels are long — your choice). |
| `line` | Line or area chart; parse `x` as time when values are ISO dates. |
| `pie` | Pie or donut; `x` = slice label, `y` = value. |
| `scatter` | Scatter / bubble; both axes numeric. |

If your library uses different prop names, map:

- **Cartesian:** `dataPoints` → `{ category/name: x, value: y }` as needed.
- **Pie:** `dataPoints` → `{ name: x, value: y }` (ensure `y` is numeric).

## Unknown or missing `chart`

If `chart` is `null` (e.g. fewer than two columns or no rows), show a **table** from `columns` + `rows` only.

## Constants (server)

Pie slice band: **2–20** rows (`MIN_PIE_SLICES` / `MAX_PIE_SLICES` in `app/services/chart_heuristics.py`). Adjust there if product wants stricter pie rules.

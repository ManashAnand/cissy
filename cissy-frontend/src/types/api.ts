/**
 * Types aligned with the FastAPI backend (DuckDB query engine).
 * Adjust when the backend contract is finalized.
 */

export type QueryColumn = {
  name: string;
  type?: string;
};

/** Single point for charting; mirrors backend `dataPoints`. */
export type ChartDataPoint = { x: unknown; y: unknown };

/** Backend `chart.type` from NL→SQL heuristics (`chart_heuristics.py`). */
export type ChartKind = "bar" | "line" | "pie" | "scatter" | "table";

export type ChartSpec = {
  type: ChartKind;
  xKey?: string;
  yKey?: string;
  title?: string;
  /** Parallel to `yValues`; same length when backend sends series arrays. */
  xValues?: unknown[];
  yValues?: unknown[];
  /** Preferred: `{ x, y }[]` — use without `rows` for history replay. */
  dataPoints?: ChartDataPoint[];
};

export type QueryResponse = {
  job_id?: string;
  sql?: string;
  columns: QueryColumn[];
  /** Row objects keyed by column name (tuple rows from the API are normalized in `postQuery`). */
  rows: Record<string, unknown>[];
  chart?: ChartSpec;
  insight?: string;
  error?: string;
};

export type QueryRequest = {
  message: string;
  /** Same as backend `job_id` (wire alias). */
  conversationId?: string;
};

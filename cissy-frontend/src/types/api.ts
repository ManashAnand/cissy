/**
 * Types aligned with the FastAPI backend (DuckDB query engine).
 * Adjust when the backend contract is finalized.
 */

export type QueryColumn = {
  name: string;
  type?: string;
};

export type ChartSpec = {
  type: "bar" | "line" | "pie" | "table";
  xKey?: string;
  yKey?: string;
  title?: string;
};

export type QueryResponse = {
  sql?: string;
  columns: QueryColumn[];
  rows: Record<string, unknown>[];
  chart?: ChartSpec;
  insight?: string;
  error?: string;
};

export type QueryRequest = {
  message: string;
  conversationId?: string;
};

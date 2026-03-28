import type { QueryColumn, QueryResponse } from "@/types/api";

/**
 * Backend may return `rows` as an array of tuples aligned with `columns`,
 * e.g. `[["milk", 0.78], ...]`. The UI expects row objects: `{ aisle: "milk", ... }`.
 */
export function normalizeQueryResponse(raw: QueryResponse): QueryResponse {
  const columns = raw.columns ?? [];
  const rows = normalizeRows(columns, raw.rows as unknown);
  return { ...raw, columns, rows };
}

function normalizeRows(
  columns: QueryColumn[],
  rows: unknown
): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return [];
  const names = columns.map((c) => c.name);
  return rows.map((row) => {
    if (Array.isArray(row)) {
      const out: Record<string, unknown> = {};
      for (let i = 0; i < names.length; i++) {
        out[names[i]] = row[i];
      }
      return out;
    }
    if (row !== null && typeof row === "object") {
      return row as Record<string, unknown>;
    }
    return {};
  });
}

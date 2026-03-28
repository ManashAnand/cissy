"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSpec } from "@/types/api";
import { cn } from "@/lib/utils/cn";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#c4b5fd",
  "#94a3b8",
  "#64748b",
];

type ChartRow = { label: string; value: number };

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function labelOf(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Build rows for Recharts from backend chart payload or tabular rows. */
export function buildChartRows(
  chart: ChartSpec | undefined,
  rows: Record<string, unknown>[] | undefined
): ChartRow[] {
  if (!chart) return [];

  if (chart.dataPoints?.length) {
    return chart.dataPoints.map((p) => ({
      label: labelOf(p.x),
      value: toNum(p.y),
    }));
  }

  const xv = chart.xValues;
  const yv = chart.yValues;
  if (xv?.length && yv?.length) {
    const n = Math.min(xv.length, yv.length);
    return Array.from({ length: n }, (_, i) => ({
      label: labelOf(xv[i]),
      value: toNum(yv[i]),
    }));
  }

  const xk = chart.xKey;
  const yk = chart.yKey;
  if (xk && yk && rows?.length) {
    return rows.map((r) => ({
      label: labelOf(r[xk]),
      value: toNum(r[yk]),
    }));
  }

  return [];
}

export function chartHasRenderableData(
  chart: ChartSpec | undefined,
  rows: Record<string, unknown>[] | undefined
): boolean {
  if (!chart || chart.type === "table") return false;
  return buildChartRows(chart, rows).length > 0;
}

type QueryChartProps = {
  chart: ChartSpec;
  rows: Record<string, unknown>[];
  className?: string;
};

export function QueryChart({ chart, rows, className }: QueryChartProps) {
  if (chart.type === "table") return null;

  const data = buildChartRows(chart, rows);
  if (data.length === 0) return null;

  const title = chart.title?.trim();
  const kind = chart.type === "line" ? "line" : chart.type === "pie" ? "pie" : "bar";

  return (
    <div
      className={cn(
        "rounded-md border border-border/60 bg-card/50 p-3 shadow-sm",
        className
      )}
    >
      {title ? (
        <p className="mb-2 text-center text-xs font-medium text-muted-foreground">{title}</p>
      ) : null}
      <div className="h-[220px] w-full min-w-0" aria-label="Query result chart">
        <ResponsiveContainer width="100%" height="100%">
          {kind === "pie" ? (
            <PieChart>
              <Pie
                data={data.map((d) => ({ name: d.label, value: d.value }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={72}
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatTooltipNumber(v)} />
              <Legend />
            </PieChart>
          ) : kind === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={70}
              />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatAxisNumber(v)} />
              <Tooltip
                formatter={(v: number) => [formatTooltipNumber(v), chart.yKey ?? "y"]}
                labelFormatter={(l) => String(l)}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
                name={chart.yKey ?? "value"}
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={70}
              />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatAxisNumber(v)} />
              <Tooltip
                formatter={(v: number) => [formatTooltipNumber(v), chart.yKey ?? "y"]}
                labelFormatter={(l) => String(l)}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={chart.yKey ?? "value"} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatAxisNumber(n: number): string {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

function formatTooltipNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

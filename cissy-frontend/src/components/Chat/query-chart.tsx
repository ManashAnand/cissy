"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
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

type ScatterPoint = { x: number; y: number };

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

function toNumOrZero(v: unknown): number {
  const n = toNum(v);
  return Number.isFinite(n) ? n : 0;
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
      value: toNumOrZero(p.y),
    }));
  }

  const xv = chart.xValues;
  const yv = chart.yValues;
  if (xv?.length && yv?.length) {
    const n = Math.min(xv.length, yv.length);
    return Array.from({ length: n }, (_, i) => ({
      label: labelOf(xv[i]),
      value: toNumOrZero(yv[i]),
    }));
  }

  const xk = chart.xKey;
  const yk = chart.yKey;
  if (xk && yk && rows?.length) {
    return rows.map((r) => ({
      label: labelOf(r[xk]),
      value: toNumOrZero(r[yk]),
    }));
  }

  return [];
}

/** Numeric (x,y) pairs for scatter — both axes are measures. */
export function buildScatterPoints(
  chart: ChartSpec | undefined,
  rows: Record<string, unknown>[] | undefined
): ScatterPoint[] {
  if (!chart) return [];

  const fromPair = (x: unknown, y: unknown): ScatterPoint | null => {
    const nx = toNum(x);
    const ny = toNum(y);
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) return null;
    return { x: nx, y: ny };
  };

  if (chart.dataPoints?.length) {
    return chart.dataPoints
      .map((p) => fromPair(p.x, p.y))
      .filter((p): p is ScatterPoint => p !== null);
  }

  const xv = chart.xValues;
  const yv = chart.yValues;
  if (xv?.length && yv?.length) {
    const n = Math.min(xv.length, yv.length);
    const out: ScatterPoint[] = [];
    for (let i = 0; i < n; i++) {
      const p = fromPair(xv[i], yv[i]);
      if (p) out.push(p);
    }
    return out;
  }

  const xk = chart.xKey;
  const yk = chart.yKey;
  if (xk && yk && rows?.length) {
    return rows
      .map((r) => fromPair(r[xk], r[yk]))
      .filter((p): p is ScatterPoint => p !== null);
  }

  return [];
}

function isIsoDateLikeLabel(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(s.trim());
}

/** Line chart: categorical labels, or time + value when x labels look like ISO dates. */
function buildLineChartData(data: ChartRow[]): ChartRow[] | { t: number; value: number }[] {
  if (data.length === 0) return data;
  const labels = data.map((d) => d.label);
  const allDates = labels.every((l) => isIsoDateLikeLabel(l));
  if (!allDates) return data;
  const mapped: { t: number; value: number }[] = [];
  for (const d of data) {
    const ts = Date.parse(d.label);
    if (!Number.isFinite(ts)) return data;
    mapped.push({ t: ts, value: d.value });
  }
  return mapped;
}

export function chartHasRenderableData(
  chart: ChartSpec | undefined,
  rows: Record<string, unknown>[] | undefined
): boolean {
  if (!chart || chart.type === "table") return false;
  if (chart.type === "scatter") {
    return buildScatterPoints(chart, rows).length > 0;
  }
  return buildChartRows(chart, rows).length > 0;
}

function PieSliceTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  /** Recharts pie payload — keep loose for library generics. */
  payload?: ReadonlyArray<{ name?: unknown; value?: unknown; payload?: { name?: unknown; value?: unknown } }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const name = String(p.payload?.name ?? p.name ?? "");
  const value = Number(p.payload?.value ?? p.value ?? 0);
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="max-w-[min(280px,85vw)] rounded-md border border-border bg-popover px-2.5 py-2 text-xs shadow-md">
      <p className="font-medium leading-snug text-popover-foreground">{name}</p>
      <p className="mt-1 tabular-nums text-muted-foreground">
        {formatTooltipNumber(value)}{" "}
        <span className="text-foreground/90">({pct.toFixed(1)}%)</span>
      </p>
    </div>
  );
}

function PieLegendList({ data, total }: { data: ChartRow[]; total: number }) {
  return (
    <ul
      className="max-h-36 overflow-y-auto overscroll-contain border-t border-border/60 pt-2 text-xs [scrollbar-gutter:stable]"
      aria-label="Chart legend"
    >
      {data.map((d, i) => (
        <li key={`${d.label}-${i}`} className="flex gap-2.5 border-b border-border/30 py-2 last:border-b-0">
          <span
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="break-words leading-snug text-foreground">{d.label}</p>
            <p className="mt-0.5 tabular-nums text-muted-foreground">
              {formatTooltipNumber(d.value)} · {((d.value / total) * 100).toFixed(1)}%
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PieChartPanel({ data }: { data: ChartRow[] }) {
  const pieData = data.map((d) => ({ name: d.label, value: d.value }));
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className="flex w-full min-w-0 flex-col">
      <div className="aspect-[5/3] min-h-[200px] w-full max-h-[280px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="46%"
              outerRadius="74%"
              paddingAngle={0.7}
              stroke="hsl(var(--background))"
              strokeWidth={2}
              label={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={(props) => (
                <PieSliceTooltip active={props.active} payload={props.payload} total={total} />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <PieLegendList data={data} total={total} />
    </div>
  );
}

type QueryChartProps = {
  chart: ChartSpec;
  rows: Record<string, unknown>[];
  className?: string;
};

export function QueryChart({ chart, rows, className }: QueryChartProps) {
  if (chart.type === "table") return null;

  const title = chart.title?.trim();
  const kind = chart.type;

  if (kind === "scatter") {
    const scatter = buildScatterPoints(chart, rows);
    if (scatter.length === 0) return null;
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
        <div className="h-[240px] w-full min-w-0" aria-label="Query result scatter chart">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis
                type="number"
                dataKey="x"
                name={chart.xKey ?? "x"}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatAxisNumber(Number(v))}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={chart.yKey ?? "y"}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatAxisNumber(Number(v))}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(v: number, name: string) => [formatTooltipNumber(v), name]}
              />
              <Scatter
                name={`${chart.yKey ?? "y"} vs ${chart.xKey ?? "x"}`}
                data={scatter}
                fill="hsl(var(--primary))"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  const data = buildChartRows(chart, rows);
  if (data.length === 0) return null;

  const barHorizontal =
    kind === "bar" &&
    (data.length > 10 || data.some((d) => d.label.length > 16));

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
      <div
        className={cn("w-full min-w-0", kind !== "pie" && "h-[220px]")}
        aria-label="Query result chart"
      >
        {kind === "pie" ? (
          <PieChartPanel data={data} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {kind === "line" ? (
            (() => {
              const lineData = buildLineChartData(data);
              const timeMode = lineData.length > 0 && "t" in lineData[0];
              return (
                <LineChart
                  data={lineData as object[]}
                  margin={{ top: 8, right: 8, left: 0, bottom: timeMode ? 8 : 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  {timeMode ? (
                    <>
                      <XAxis
                        dataKey="t"
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(ts) =>
                          new Date(ts as number).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <Tooltip
                        formatter={(v: number) => [formatTooltipNumber(v), chart.yKey ?? "y"]}
                        labelFormatter={(ts) =>
                          new Date(ts as number).toLocaleString(undefined, {
                            dateStyle: "medium",
                          })
                        }
                      />
                    </>
                  ) : (
                    <>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={70}
                      />
                      <Tooltip
                        formatter={(v: number) => [formatTooltipNumber(v), chart.yKey ?? "y"]}
                        labelFormatter={(l) => String(l)}
                      />
                    </>
                  )}
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatAxisNumber(v)} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={chart.yKey ?? "value"}
                  />
                </LineChart>
              );
            })()
          ) : (
            <BarChart
              layout={barHorizontal ? "vertical" : "horizontal"}
              data={data}
              margin={
                barHorizontal
                  ? { top: 8, right: 8, left: 4, bottom: 8 }
                  : { top: 8, right: 8, left: 0, bottom: 4 }
              }
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              {barHorizontal ? (
                <>
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatAxisNumber(v)} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    width={Math.min(200, 14 + Math.max(...data.map((d) => d.label.length)) * 6)}
                    tick={{ fontSize: 10 }}
                    interval={0}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatTooltipNumber(v), chart.yKey ?? "y"]}
                    labelFormatter={(l) => String(l)}
                  />
                  <Bar
                    dataKey="value"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                    name={chart.yKey ?? "value"}
                  />
                </>
              ) : (
                <>
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
                  <Bar
                    dataKey="value"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name={chart.yKey ?? "value"}
                  />
                </>
              )}
            </BarChart>
          )}
          </ResponsiveContainer>
        )}
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

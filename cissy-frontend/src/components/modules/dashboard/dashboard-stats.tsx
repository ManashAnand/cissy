"use client";

import {
  BarChart3,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

type DashboardStatsProps = {
  totalProjects: number;
  completedCount: number;
  documentsProcessed: number;
  avgProcessingLabel: string;
  pendingCount: number;
};

const ACCENTS = [
  "border-l-violet-500 dark:border-l-violet-400",
  "border-l-indigo-500 dark:border-l-indigo-400",
  "border-l-sky-500 dark:border-l-sky-400",
  "border-l-amber-500 dark:border-l-amber-400",
] as const;

export function DashboardStats({
  totalProjects,
  completedCount,
  documentsProcessed,
  avgProcessingLabel,
  pendingCount,
}: DashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        accent={ACCENTS[0]}
        label="Total Projects"
        value={String(totalProjects)}
        subtext={`${completedCount} completed`}
        icon={BarChart3}
        chip={{ label: "Active", className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400" }}
      />
      <StatCard
        accent={ACCENTS[1]}
        label="Documents Processed"
        value={String(documentsProcessed)}
        subtext="Files analyzed"
        icon={FileText}
        chip={{ label: "Active", className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400" }}
      />
      <StatCard
        accent={ACCENTS[2]}
        label="Average Processing Time"
        value={avgProcessingLabel}
        subtext="Per document"
        icon={Clock}
      />
      <StatCard
        accent={ACCENTS[3]}
        label="Pending Analysis"
        value={String(pendingCount)}
        subtext="In progress"
        icon={Loader2}
        iconClassName="animate-spin"
        chip={{ label: "Pending", className: "bg-amber-500/15 text-amber-900 dark:text-amber-400" }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconClassName,
  chip,
  accent,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  chip?: { label: string; className: string };
  accent: string;
}) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-card transition-all duration-200",
        "hover:shadow-card-hover hover:border-primary/20",
        "border-l-4",
        accent
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2 pt-5 px-5">
        <div className="space-y-1 min-w-0 flex-1">
          <span className="text-sm font-medium text-muted-foreground leading-snug">
            {label}
          </span>
          {chip ? (
            <span
              className={cn(
                "inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium",
                chip.className
              )}
            >
              {chip.label}
            </span>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            "bg-gradient-to-br from-primary/15 to-indigo-500/10 text-primary",
            "ring-1 ring-primary/10 dark:from-primary/20 dark:to-indigo-400/10"
          )}
        >
          <Icon className={cn("h-5 w-5", iconClassName)} />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0">
        <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{subtext}</p>
      </CardContent>
    </Card>
  );
}

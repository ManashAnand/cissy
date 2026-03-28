"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FolderOpen, LayoutGrid, List as ListIcon, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ProjectCard,
  type ProjectStatus,
} from "@/components/modules/dashboard/project-card";
import type { ConversationSummary } from "@/types/conversations";
import { deleteConversation } from "@/services/api";
import { cn } from "@/lib/utils/cn";

const STATUS_OPTIONS: (ProjectStatus | "all")[] = [
  "all",
  "Active",
  "Completed",
  "Pending",
];

function inferStatus(c: ConversationSummary): ProjectStatus {
  const ms = Date.now() - new Date(c.updated_at).getTime();
  const days = ms / 86400000;
  if (days < 3) return "Active";
  if (days < 21) return "Pending";
  return "Completed";
}

type DashboardProjectsProps = {
  conversations: ConversationSummary[];
};

export function DashboardProjects({ conversations }: DashboardProjectsProps) {
  const queryClient = useQueryClient();
  const [listMode, setListMode] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>(
    "all"
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDeleteConversation(jobId: string) {
    if (
      !confirm(
        "Delete this conversation and its messages? This cannot be undone."
      )
    ) {
      return;
    }
    setDeletingId(jobId);
    try {
      await deleteConversation(jobId);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Conversation deleted");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not delete conversation"
      );
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      const st = inferStatus(c);
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (!q) return true;
      const label = (c.label ?? "").toLowerCase();
      return (
        label.includes(q) ||
        c.job_id.toLowerCase().includes(q)
      );
    });
  }, [conversations, query, statusFilter]);

  const docCount = filtered.length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Your Projects
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            Track your document analysis projects and their progress.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary tabular-nums shrink-0">
          {docCount} {docCount === 1 ? "project" : "projects"}
        </span>
      </div>

      <div
        className={cn(
          "rounded-2xl border border-border/70 bg-card/80 p-4 sm:p-5 shadow-card",
          "dark:bg-card/40 dark:border-border/50"
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70 pointer-events-none" />
            <Input
              placeholder="Search projects, companies, files..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-11 border-border/80 bg-background/80 focus-visible:ring-primary/30"
              aria-label="Search projects"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
            <label className="sr-only" htmlFor="status-filter">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as (typeof STATUS_OPTIONS)[number])
              }
              className={cn(
                "h-11 min-w-[140px] rounded-lg border border-border/80 bg-background px-3 text-sm",
                "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              )}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All Status" : s}
                </option>
              ))}
            </select>
            <div className="flex rounded-lg border border-border/80 bg-muted/40 p-0.5">
              <Button
                type="button"
                variant={listMode ? "ghost" : "secondary"}
                size="icon"
                className="h-10 w-10 rounded-md"
                onClick={() => setListMode(false)}
                aria-label="Grid view"
                aria-pressed={!listMode}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={listMode ? "secondary" : "ghost"}
                size="icon"
                className="h-10 w-10 rounded-md"
                onClick={() => setListMode(true)}
                aria-label="List view"
                aria-pressed={listMode}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/20",
            "bg-gradient-to-b from-primary/[0.04] to-transparent dark:from-primary/10 px-6 py-14 text-center"
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <FolderOpen className="h-7 w-7" />
          </div>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            No projects match your filters. Start a <strong className="text-foreground font-medium">New chat</strong>{" "}
            above to create one.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "gap-4 sm:gap-5",
            listMode ? "flex flex-col" : "grid sm:grid-cols-2 xl:grid-cols-3"
          )}
        >
          {filtered.map((c) => (
            <ProjectCard
              key={c.job_id}
              conversation={c}
              status={inferStatus(c)}
              listMode={listMode}
              onDelete={handleDeleteConversation}
              isDeleting={deletingId === c.job_id}
            />
          ))}
        </div>
      )}
    </section>
  );
}

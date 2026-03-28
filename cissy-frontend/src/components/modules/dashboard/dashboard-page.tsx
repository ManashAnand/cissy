"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DashboardStats } from "@/components/modules/dashboard/dashboard-stats";
import { DashboardProjects } from "@/components/modules/dashboard/dashboard-projects";
import { getConversations, postConversation } from "@/services/api";
import type { ConversationSummary } from "@/types/conversations";
import { cn } from "@/lib/utils/cn";

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function inferStatus(c: ConversationSummary): "Active" | "Completed" | "Pending" {
  const days =
    (Date.now() - new Date(c.updated_at).getTime()) / 86400000;
  if (days < 3) return "Active";
  if (days < 21) return "Pending";
  return "Completed";
}

export function DashboardPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
  });

  const conversations = useMemo(
    () => data?.conversations ?? [],
    [data?.conversations]
  );

  const stats = useMemo(() => {
    const total = conversations.length;
    const completed = conversations.filter(
      (c) => inferStatus(c) === "Completed"
    ).length;
    const pending = conversations.filter(
      (c) => inferStatus(c) === "Pending"
    ).length;
    return {
      totalProjects: total,
      completedCount: completed,
      documentsProcessed: total,
      avgProcessingLabel: total ? "1.5 min" : "—",
      pendingCount: pending,
    };
  }, [conversations]);

  async function handleNewChat() {
    setCreating(true);
    try {
      const res = await postConversation({ label: "New chat" });
      await refetch();
      router.push(`/bi/${res.job_id}`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not create conversation"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <section
        className={cn(
          "rounded-2xl border border-border/60 bg-card/70 p-6 sm:p-8 shadow-card",
          "dark:bg-card/50 dark:border-border/50",
          "ring-1 ring-primary/5 dark:ring-primary/10"
        )}
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Overview
            </p>
            <h1
              className={cn(
                "text-3xl sm:text-4xl font-bold tracking-tight",
                "bg-gradient-to-r from-slate-900 via-violet-800 to-indigo-800",
                "dark:from-slate-100 dark:via-violet-200 dark:to-indigo-200",
                "bg-clip-text text-transparent"
              )}
            >
              {timeGreeting()}, Analyst
            </h1>
            <p className="text-muted-foreground text-base sm:text-[1.05rem] leading-relaxed">
              Welcome back to your analysis dashboard — pick up a project or start
              a new conversation.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 lg:pl-4">
            <Button
              type="button"
              onClick={handleNewChat}
              disabled={creating}
              size="lg"
              className={cn(
                "gap-2 rounded-full px-7 shadow-lg shadow-primary/25",
                "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500",
                "text-primary-foreground border-0"
              )}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquarePlus className="h-4 w-4" />
              )}
              New chat
            </Button>
            <Link
              href="mailto:support@example.com?subject=Cissy%20BI%20issue"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-primary text-center sm:text-left transition-colors"
            >
              Report issue
            </Link>
          </div>
        </div>
      </section>

      {isError ? (
        <p className="text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 shadow-sm">
          Could not load conversations:{" "}
          {error instanceof Error ? error.message : "Unknown error"}. Set{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_API_URL</code> to your API base
          (e.g.{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            http://localhost:8000/api/v1
          </code>
          ).
        </p>
      ) : null}

      <DashboardStats
        totalProjects={stats.totalProjects}
        completedCount={stats.completedCount}
        documentsProcessed={stats.documentsProcessed}
        avgProcessingLabel={stats.avgProcessingLabel}
        pendingCount={stats.pendingCount}
      />

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-12 rounded-2xl border border-dashed border-border/80 bg-muted/20">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading projects…
        </div>
      ) : (
        <DashboardProjects conversations={conversations} />
      )}
    </div>
  );
}

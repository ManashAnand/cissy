"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckCircle2,
  File,
  Info,
  Loader2,
  Play,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ConversationSummary } from "@/types/conversations";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";
import { cn } from "@/lib/utils/cn";
import { ProjectDetailDialog } from "@/components/modules/dashboard/project-detail-dialog";

export type ProjectStatus = "Active" | "Completed" | "Pending";

type ProjectCardProps = {
  conversation: ConversationSummary;
  status: ProjectStatus;
  listMode?: boolean;
  onDelete: (jobId: string) => void | Promise<void>;
  isDeleting?: boolean;
};

export function ProjectCard({
  conversation,
  status,
  listMode,
  onDelete,
  isDeleting = false,
}: ProjectCardProps) {
  const [companyName, setCompanyName] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  const title =
    conversation.label?.trim() || "BI conversation";

  const statusStyles: Record<ProjectStatus, string> = {
    Active: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400",
    Completed: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
    Pending: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  };

  return (
    <>
      <Card
        className={cn(
          "flex flex-col rounded-xl border-border/70 bg-card shadow-card transition-shadow duration-200",
          "hover:shadow-card-hover hover:border-primary/15",
          listMode && "sm:flex-row sm:items-stretch"
        )}
      >
        <CardHeader className={cn("space-y-3 pb-3", listMode && "sm:flex-1")}>
          <div className="flex items-start justify-between gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                statusStyles[status]
              )}
            >
              {status === "Completed" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : null}
              {status}
            </span>
          </div>
          <div>
            <h3 className="font-semibold leading-tight">{title}</h3>
            <div className="mt-2">
              <label className="sr-only" htmlFor={`company-${conversation.job_id}`}>
                Cissy name
              </label>
              <Input
                id={`company-${conversation.job_id}`}
                placeholder="Enter Cissy name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent
          className={cn(
            "pb-3 pt-0 text-sm text-muted-foreground space-y-2",
            listMode && "sm:flex sm:flex-col sm:justify-center sm:min-w-[200px]"
          )}
        >
          <div className="flex items-center gap-1.5">
            <File className="h-3.5 w-3.5 shrink-0" />
            <span>1 file</span>
          </div>
          <p>Last updated {formatRelativeTime(conversation.updated_at)}</p>
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            <span className="text-xs font-medium">Ready to launch</span>
          </div>
        </CardContent>
        <CardFooter
          className={cn(
            "flex flex-wrap gap-2 border-t bg-muted/20 pt-3 mt-auto",
            listMode && "sm:border-t-0 sm:border-l sm:mt-0 sm:max-w-[420px]"
          )}
        >
          <Button type="button" variant="outline" size="sm" disabled title="Not used in BI v1">
            <Upload className="h-3.5 w-3.5 mr-1" />
            Add Files
          </Button>
          <Button type="button" size="sm" asChild>
            <Link href={`/bi/${conversation.job_id}`}>
              <Play className="h-3.5 w-3.5 mr-1" />
              Launch
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDetailOpen(true)}
          >
            <Info className="h-3.5 w-3.5 mr-1" />
            Info
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={isDeleting}
            onClick={() => void onDelete(conversation.job_id)}
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5 mr-1" />
            )}
            Delete
          </Button>
        </CardFooter>
      </Card>

      <ProjectDetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        conversation={conversation}
        filesCountLabel="1 file"
        typeLabel="Conversational BI"
      />
    </>
  );
}

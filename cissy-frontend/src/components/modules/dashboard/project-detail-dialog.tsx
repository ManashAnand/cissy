"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConversationSummary } from "@/types/conversations";
import { formatAbsoluteDateTime } from "@/lib/utils/format-relative-time";

type ProjectDetailDialogProps = {
  open: boolean;
  onClose: () => void;
  conversation: ConversationSummary | null;
  /** Placeholder until API exposes file count per job. */
  filesCountLabel?: string;
  typeLabel?: string;
};

export function ProjectDetailDialog({
  open,
  onClose,
  conversation,
  filesCountLabel = "—",
  typeLabel = "Conversational BI",
}: ProjectDetailDialogProps) {
  if (!open || !conversation) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-detail-title"
        className="relative z-10 w-full max-w-md rounded-lg border bg-card p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="project-detail-title" className="text-lg font-semibold">
            Project details
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Job ID</dt>
            <dd className="mt-1 font-mono text-xs break-all select-all">
              {conversation.job_id}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd className="mt-1">{formatAbsoluteDateTime(conversation.created_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Files</dt>
            <dd className="mt-1">{filesCountLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="mt-1">{typeLabel}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { BiSpreadsheetPane } from "@/components/modules/bi/bi-spreadsheet-pane";
import { BiFloatingChat } from "@/components/modules/bi/bi-floating-chat";
import { BiChatDockedPanel } from "@/components/modules/bi/bi-chat-docked-panel";
import { cn } from "@/lib/utils/cn";

type BiAgentWorkspaceProps = {
  jobId: string;
  spreadsheetUrl?: string;
};

/**
 * Full-width spreadsheet with draggable Financial Analyst (`react-rnd`).
 * Minimized: docked **beside** the sheet (`BiChatDockedPanel`) at a fixed width so chat stays usable.
 */
export function BiAgentWorkspace({ jobId, spreadsheetUrl }: BiAgentWorkspaceProps) {
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <div className="relative w-full space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-mono text-muted-foreground">
          Conversation{" "}
          <span className="text-foreground/80 break-all">{jobId}</span>
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-violet-800 to-indigo-800 dark:from-slate-100 dark:via-violet-200 dark:to-indigo-200 bg-clip-text text-transparent">
          BI workspace
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Drag the <strong className="text-foreground font-medium">Financial Analyst</strong> header to
          move the window; resize from edges. Minimize docks a{" "}
          <strong className="text-foreground font-medium">chat column beside the sheet</strong> so you
          can keep typing.{" "}
          <kbd className="rounded border bg-muted px-1 text-xs">Esc</kbd> or the header buttons close the window — no dim overlay, so the sheet stays fully visible.
        </p>
      </div>

      <div
        className={cn(
          "relative flex w-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card",
          "min-h-[calc(100dvh-13rem)] lg:min-h-[calc(100dvh-11rem)]"
        )}
      >
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5 text-sm">
            <span className="font-semibold text-foreground">Credit spreads (output)</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Excel viewer
            </span>
          </header>
          <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
              <BiSpreadsheetPane
                url={spreadsheetUrl}
                className="min-h-[min(60vh,520px)] lg:min-h-0"
              />
            </div>
            {!chatOpen && (
              <BiChatDockedPanel jobId={jobId} onPopOut={() => setChatOpen(true)} />
            )}
          </div>
        </section>
      </div>

      <BiFloatingChat jobId={jobId} open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}

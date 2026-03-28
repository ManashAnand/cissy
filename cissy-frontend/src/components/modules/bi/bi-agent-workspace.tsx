"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { BiSpreadsheetPane } from "@/components/modules/bi/bi-spreadsheet-pane";
import { BiFloatingChat } from "@/components/modules/bi/bi-floating-chat";
import { BiChatDockedPanel } from "@/components/modules/bi/bi-chat-docked-panel";
import { clearThreadMessages } from "@/redux/features/conversationSlice";
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
  const dispatch = useDispatch();
  const [chatOpen, setChatOpen] = useState(true);
  const prevJobIdRef = useRef(jobId);

  /** Reset thread + query preview only when navigating to a different job — not when toggling floating ↔ docked. */
  useEffect(() => {
    if (prevJobIdRef.current !== jobId) {
      dispatch(clearThreadMessages());
      prevJobIdRef.current = jobId;
    }
  }, [jobId, dispatch]);

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
       
      </div>

      <div
        className={cn(
          "relative flex h-[calc(100dvh-5rem)] max-h-[calc(100dvh-5rem)] w-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card",
          "max-md:h-auto max-md:max-h-none"
        )}
      >
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5 text-sm">
            <span className="font-semibold text-foreground">Cissy spreads (output)</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Excel viewer
            </span>
          </header>
          {/* Fills card below header; docked chat scroll uses flex min-h-0 + basis-0 chain; sheet ~40 rows */}
          <div
            className={cn(
              "relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row lg:items-stretch",
              "min-h-[min(52vh,520px)] lg:min-h-0"
            )}
          >
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0 lg:max-h-full">
              <BiSpreadsheetPane url={spreadsheetUrl} className="min-h-0" variant="workspace" />
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

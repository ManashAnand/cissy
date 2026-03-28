"use client";

import { Maximize2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatShell } from "@/components/Chat/chat-shell";
import { cn } from "@/lib/utils/cn";

type BiChatDockedPanelProps = {
  jobId: string;
  onPopOut: () => void;
};

/**
 * Docked Financial Analyst beside the sheet: fixed width so the full chat UI stays usable
 * (not a narrow vertical tab).
 */
export function BiChatDockedPanel({ jobId, onPopOut }: BiChatDockedPanelProps) {
  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col overflow-hidden border-t border-border bg-card",
        "min-h-[min(52vh,440px)] max-h-[min(60vh,560px)]",
        "lg:min-h-0 lg:max-h-full lg:w-[min(420px,42vw)] lg:min-w-[300px] lg:max-w-[440px] lg:flex-shrink-0",
        "lg:self-stretch lg:border-l lg:border-t-0"
      )}
      aria-label="Financial Analyst chat"
    >
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-2.5 sm:px-4"
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
            Financial Analyst
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-muted-foreground"
          onClick={onPopOut}
          aria-label="Pop out to floating window"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </header>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden bg-background/95 p-3 sm:p-4",
          "basis-0 lg:min-h-0"
        )}
      >
        <ChatShell floating routeJobId={jobId} />
      </div>
    </aside>
  );
}

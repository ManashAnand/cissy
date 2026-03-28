"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Rnd } from "react-rnd";
import { Minimize2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatShell } from "@/components/Chat/chat-shell";
import { cn } from "@/lib/utils/cn";

type BiFloatingChatProps = {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Layout = { x: number; y: number; width: number; height: number };

function initialLayout(): Layout {
  if (typeof window === "undefined") {
    return { x: 80, y: 80, width: 448, height: 560 };
  }
  const w = Math.min(448, window.innerWidth - 48);
  const h = Math.min(Math.floor(window.innerHeight * 0.82), 680);
  return {
    width: w,
    height: h,
    x: Math.max(16, (window.innerWidth - w) / 2 - 48),
    y: Math.max(16, (window.innerHeight - h) / 2),
  };
}

/**
 * Draggable + resizable Financial Analyst (react-rnd), z-9999.
 * No fullscreen dim overlay — sheet stays fully visible. Close via header or Esc.
 */
export function BiFloatingChat({ jobId, open, onOpenChange }: BiFloatingChatProps) {
  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState<Layout>(initialLayout);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open && mounted) {
      setLayout(initialLayout());
    }
  }, [open, mounted]);

  const onEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onOpenChange(false);
    },
    [open, onOpenChange]
  );

  useEffect(() => {
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onEscape]);

  if (!mounted || !open) return null;

  return createPortal(
    <Rnd
      size={{ width: layout.width, height: layout.height }}
      position={{ x: layout.x, y: layout.y }}
      onDragStop={(_e, d) => setLayout((l) => ({ ...l, x: d.x, y: d.y }))}
      onResizeStop={(_e, _dir, ref, _delta, pos) => {
        const width = parseInt(ref.style.width, 10);
        const height = parseInt(ref.style.height, 10);
        setLayout({
          width: Number.isFinite(width) ? width : layout.width,
          height: Number.isFinite(height) ? height : layout.height,
          x: pos.x,
          y: pos.y,
        });
      }}
      minWidth={300}
      minHeight={360}
      bounds="window"
      dragHandleClassName="bi-floating-chat-drag"
      className="z-[9999]"
      enableResizing={{
        bottom: true,
        bottomLeft: false,
        bottomRight: true,
        left: false,
        right: true,
        top: false,
        topLeft: false,
        topRight: false,
      }}
    >
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="bi-floating-chat-title"
        className={cn(
          "flex h-full max-h-[calc(100vh-32px)] flex-col overflow-hidden",
          "rounded-2xl border border-border bg-card shadow-2xl"
        )}
      >
        <header
          className={cn(
            "bi-floating-chat-drag flex shrink-0 cursor-move select-none items-center justify-between gap-2",
            "border-b border-border/60 bg-muted/40 px-4 py-3"
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <h2
              id="bi-floating-chat-title"
              className="truncate text-base font-semibold text-foreground"
            >
              Financial Analyst
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={() => onOpenChange(false)}
              aria-label="Minimize to docked chat beside sheet"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background/95 p-3 sm:p-4">
          <ChatShell floating routeJobId={jobId} />
        </div>
      </div>
    </Rnd>,
    document.body
  );
}

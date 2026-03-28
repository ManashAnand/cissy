"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type SqlBlockProps = {
  sql: string;
  className?: string;
};

export function SqlBlock({ sql, className }: SqlBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [sql]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/80 bg-zinc-950 shadow-inner",
        "ring-1 ring-white/5 dark:ring-white/10",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-zinc-900/90 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          SQL
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white"
          onClick={() => void copy()}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copy
            </>
          )}
        </Button>
      </div>
      <pre
        className={cn(
          "m-0 max-h-[min(320px,50vh)] overflow-auto p-3 text-[13px] leading-relaxed",
          "font-mono text-zinc-100 [tab-size:2]",
          "[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2",
          "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-600"
        )}
      >
        <code className="block whitespace-pre text-left">{sql}</code>
      </pre>
    </div>
  );
}

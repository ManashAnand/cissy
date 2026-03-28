"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { isGoogleSpreadsheetUrl, toEmbedSrc } from "@/lib/bi/spreadsheet-url";
import { getResolvedGoogleTabs, tabsStorageKey } from "@/lib/bi/spreadsheet-tabs";

type BiSpreadsheetPaneProps = {
  /** Google Sheet (or any) URL to embed. Query `?widget=true&headers=false` is appended for Google hosts when missing. */
  url?: string | null;
  className?: string;
  /**
   * BI workspace: cap embed height (~40 visible rows) and scroll inside the iframe.
   * Default: flexible height for other layouts.
   */
  variant?: "default" | "workspace";
};

const TAB_STORAGE_PREFIX = "bi-spreadsheet-tab-index:";

export function BiSpreadsheetPane({
  url,
  className,
  variant = "default",
}: BiSpreadsheetPaneProps) {
  const fallbackUrl =
    url?.trim() ||
    (typeof process.env.NEXT_PUBLIC_BI_SPREADSHEET_URL === "string"
      ? process.env.NEXT_PUBLIC_BI_SPREADSHEET_URL.trim()
      : "");

  const tabs = useMemo(() => getResolvedGoogleTabs(fallbackUrl), [fallbackUrl]);

  const storageKey =
    tabs.length > 0 ? `${TAB_STORAGE_PREFIX}${tabsStorageKey(tabs)}` : null;

  const [tabIndex, setTabIndex] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    if (!storageKey || tabs.length === 0) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw === null) return;
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 0 && n < tabs.length) setTabIndex(n);
    } catch {
      /* ignore */
    }
  }, [storageKey, tabs.length]);

  useEffect(() => {
    if (tabIndex >= tabs.length) setTabIndex(0);
  }, [tabIndex, tabs.length]);

  const persistIndex = useCallback(
    (next: number) => {
      setTabIndex(next);
      if (storageKey && tabs.length > 0) {
        try {
          sessionStorage.setItem(storageKey, String(next));
        } catch {
          /* ignore */
        }
      }
    },
    [storageKey, tabs.length]
  );

  const activeTab = tabs[Math.min(tabIndex, Math.max(0, tabs.length - 1))];
  const rawSrc = activeTab?.url ?? "";
  const google = rawSrc && isGoogleSpreadsheetUrl(rawSrc);

  const src = useMemo(() => {
    if (!rawSrc) return "";
    return toEmbedSrc(rawSrc);
  }, [rawSrc]);

  useEffect(() => {
    setIframeLoaded(false);
  }, [src]);

  if (tabs.length === 0 || !rawSrc) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-4 bg-muted/30 p-8 text-center min-h-[240px]",
          className
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Table2 className="h-7 w-7" />
        </div>
        <div className="max-w-md space-y-2">
          <p className="font-medium text-foreground">No spreadsheet URL yet</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Set <code className="text-xs bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_BI_SPREADSHEET_URL</code>{" "}
            in <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.local</code>, configure tabs in{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">src/config/bi-spreadsheet-tabs.ts</code>, or open
            with <code className="text-xs bg-muted px-1 py-0.5 rounded">?excel=&lt;encoded-url&gt;</code>{" "}
            (see <span className="whitespace-nowrap">docs/bi-spreadsheet-embed.md</span>).
          </p>
        </div>
      </div>
    );
  }

  const showTabBar = google && tabs.length > 1;

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-col bg-muted/20",
        variant === "workspace" ? "shrink-0" : "flex-1",
        className
      )}
    >
      {showTabBar ? (
        <div
          className={cn(
            "flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2",
            "sm:gap-3"
          )}
        >
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Previous sheet"
              disabled={tabIndex <= 0}
              onClick={() => persistIndex(Math.max(0, tabIndex - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Next sheet"
              disabled={tabIndex >= tabs.length - 1}
              onClick={() => persistIndex(Math.min(tabs.length - 1, tabIndex + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <label className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md">
            <span className="sr-only">Sheet tab</span>
            <select
              className={cn(
                "h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm",
                "shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
              value={tabIndex}
              onChange={(e) => persistIndex(Number(e.target.value))}
            >
              {tabs.map((t, i) => (
                <option key={`${t.url}-${i}`} value={i}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {tabIndex + 1} / {tabs.length}
          </span>
        </div>
      ) : null}
      <div
        className={cn(
          "relative min-h-0 w-full overflow-hidden",
          variant === "workspace"
            ? "max-h-[min(60rem,calc(100dvh-12rem))] shrink-0 h-[min(60rem,calc(100dvh-12rem))] lg:h-[min(60rem,calc(100dvh-10rem))]"
            : "min-h-[280px] flex-1"
        )}
      >
        {!iframeLoaded ? (
          <div
            className={cn(
              "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3",
              "bg-muted/40 backdrop-blur-[1px]"
            )}
            aria-busy
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">Loading spreadsheet…</p>
          </div>
        ) : null}
        <iframe
          title={activeTab?.name ?? "Cissy spreads (output)"}
          key={src}
          src={src}
          onLoad={() => setIframeLoaded(true)}
          className={cn(
            "w-full border-0",
            variant === "workspace"
              ? "h-full min-h-[200px]"
              : "h-full min-h-[280px] flex-1"
          )}
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}

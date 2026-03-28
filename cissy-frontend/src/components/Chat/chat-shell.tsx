"use client";

import { useId, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Loader2, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MAX_TABLE_ROWS } from "@/lib/constants";
import type { RootState } from "@/redux/store";
import {
  addMessage,
  clearMessages,
  clearThreadMessages,
  hydrateThread,
  setConversationId,
  setLastQueryResult,
  type ChatMessage,
} from "@/redux/features/conversationSlice";
import { mapMessagesResponse } from "@/lib/conversation/map-server-messages";
import { getConversationMessages, postQuery } from "@/services/api";
import type { QueryResponse } from "@/types/api";
import { cn } from "@/lib/utils/cn";
import { SqlBlock } from "@/components/Chat/sql-block";
import { chartHasRenderableData, QueryChart } from "@/components/Chat/query-chart";

type ChatShellProps = {
  routeJobId?: string | null;
  embedded?: boolean;
  /** Centered modal-style float (§14): gradient welcome, resize-y input, quick actions. */
  floating?: boolean;
};

const QUICK_ACTIONS = [
  { label: "Top departments", text: "Show top departments by order volume" },
  { label: "Reorder rate", text: "Which aisles have the highest reorder rate?" },
  { label: "Sample size", text: "How many orders are in the dataset?" },
] as const;

export function ChatShell({
  routeJobId = null,
  embedded = false,
  floating = false,
}: ChatShellProps) {
  const dispatch = useDispatch();
  const { messages, conversationId, lastQueryResult } = useSelector(
    (s: RootState) => s.conversation
  );
  const formId = useId();
  const [queryLoading, setQueryLoading] = useState(false);
  const [draft, setDraft] = useState("");

  /** Sync route scope only — do not clear messages here; floating ↔ docked remounts `ChatShell` with the same `jobId`. */
  useEffect(() => {
    dispatch(setConversationId(routeJobId ?? null));
  }, [dispatch, routeJobId]);

  /** Load persisted thread when scoped to a BI job (`/bi/[jobId]`). Runs here so it fires after `ChatShell` mounts (floating chat delays first paint). */
  useEffect(() => {
    if (!routeJobId) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await getConversationMessages(routeJobId);
        if (cancelled) return;
        const { messages: mapped, lastQueryResult } = mapMessagesResponse(raw);
        dispatch(
          hydrateThread({
            messages: mapped,
            lastQueryResult,
            conversationId: routeJobId,
          })
        );
      } catch (e) {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : "Failed to load conversation");
        dispatch(
          hydrateThread({
            messages: [],
            lastQueryResult: null,
            conversationId: routeJobId,
          })
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, routeJobId]);

  async function submitMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };
    dispatch(addMessage(userMsg));
    if (floating) setDraft("");

    setQueryLoading(true);
    dispatch(setLastQueryResult(null));
    try {
      const res = await postQuery({
        message: trimmed,
        conversationId: conversationId ?? undefined,
      });
      dispatch(setLastQueryResult(res));
      if (res.job_id) {
        dispatch(setConversationId(res.job_id));
      }
      if (res.error) {
        toast.error(res.error);
      }
      const assistantText = [
        res.insight,
        res.rows?.length
          ? `\n\n(${res.rows.length} row${res.rows.length === 1 ? "" : "s"})`
          : "",
      ]
        .filter(Boolean)
        .join("");

      dispatch(
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: assistantText || "No response body.",
          sql: res.sql?.trim() || undefined,
          createdAt: Date.now(),
        })
      );
    } catch (e) {
      dispatch(setLastQueryResult(null));
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setQueryLoading(false);
    }
  }

  async function onSubmitForm(formData: FormData) {
    const text = String(formData.get("message") ?? "").trim();
    await submitMessage(text);
    const form = document.getElementById(formId) as HTMLFormElement;
    form?.reset();
  }

  const queryPanel = (
    <QueryResultsPanel
      loading={queryLoading}
      result={lastQueryResult}
      embedded={embedded}
      floating={floating}
    />
  );

  const welcomeEmptyState = (
    <div className="flex shrink-0 flex-col items-center gap-2 pb-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <MessageCircle className="h-6 w-6" />
      </div>
      <h3
        className={cn(
          "text-xl font-semibold tracking-tight",
          "bg-gradient-to-r from-violet-600 via-violet-400 to-foreground/90",
          "dark:from-violet-300 dark:via-violet-200 dark:to-white/85",
          "bg-clip-text text-transparent"
        )}
      >
        How can I help you today?
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Ask anything about your Instacart-style data — metrics, joins, and SQL insights.
      </p>
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        {QUICK_ACTIONS.map((q) => (
          <Button
            key={q.label}
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full text-xs"
            onClick={() => {
              setDraft(q.text);
            }}
          >
            <Sparkles className="mr-1 h-3 w-3 opacity-70" />
            {q.label}
          </Button>
        ))}
      </div>
    </div>
  );

  const messageBubbles =
    messages.length > 0
      ? messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-6 rounded-lg bg-primary/10 p-3 sm:ml-8"
                : "mr-6 rounded-lg border border-border/50 bg-secondary/90 p-3 sm:mr-8"
            }
          >
            {m.role === "user" ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
            ) : (
              <AssistantMessageBody message={m} />
            )}
          </div>
        ))
      : null;

  const floatingForm = (
    <form
      id={formId}
      className="flex shrink-0 flex-col gap-2 border-t border-border/50 pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submitMessage(draft);
      }}
    >
      <Textarea
        name="message"
        placeholder="Message the Financial Analyst…"
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="min-h-[80px] resize-y"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={queryLoading}>
          {queryLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Querying…
            </>
          ) : (
            "Send"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={queryLoading}
          onClick={() => {
            dispatch(routeJobId ? clearThreadMessages() : clearMessages());
            setDraft("");
          }}
        >
          Clear
        </Button>
      </div>
    </form>
  );

  const shell = (
    <>
      <div
        className={cn(
          "rounded-md border bg-muted/30 p-3 sm:p-4 overflow-y-auto space-y-3 text-sm min-h-[160px]",
          embedded ? "flex-1 min-h-0 max-h-none border-border/60" : "max-h-[420px]"
        )}
      >
        {!embedded && messages.length === 0 ? (
          <p className="text-muted-foreground">
            Ask a question in plain English. The FastAPI backend (DuckDB) should expose{" "}
            <code className="text-xs">POST /query</code>.
          </p>
        ) : null}
        {messageBubbles}
      </div>

      <form
        action={async (fd) => {
          await onSubmitForm(fd);
        }}
        id={formId}
        className="flex flex-col gap-2 shrink-0"
      >
        <Textarea
          name="message"
          placeholder="e.g. Top 10 departments by reorder rate"
          rows={embedded ? 2 : 3}
          className={embedded ? "min-h-[72px]" : undefined}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={queryLoading}>
            {queryLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Querying…
              </>
            ) : (
              "Send"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={queryLoading}
            onClick={() => {
              dispatch(routeJobId ? clearThreadMessages() : clearMessages());
            }}
          >
            Clear
          </Button>
        </div>
      </form>

      {queryPanel}
    </>
  );

  if (floating) {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden basis-0">
        {!routeJobId ? (
          <p className="shrink-0 text-xs text-amber-700 dark:text-amber-400">
            Missing job scope — reload the page.
          </p>
        ) : null}
        <div className="flex min-h-0 flex-1 basis-0 flex-col gap-0 overflow-hidden">
          <div
            className={cn(
              "min-h-0 flex-1 basis-0 overflow-y-auto overflow-x-hidden overscroll-contain",
              "rounded-md border border-border/60 bg-muted/30 p-3 sm:p-4",
              "space-y-3 text-sm [scrollbar-gutter:stable]"
            )}
          >
            {messages.length === 0 ? welcomeEmptyState : null}
            {messageBubbles}
            {queryPanel}
          </div>
          {floatingForm}
        </div>
      </div>
    );
  }

  if (embedded) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-3 rounded-xl border border-border/60 bg-card/50 p-3 shadow-inner">
        {!routeJobId ? (
          <p className="shrink-0 text-xs text-amber-700 dark:text-amber-400">
            Missing job scope — reload the page.
          </p>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col gap-3">{shell}</div>
      </div>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">Conversation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{shell}</CardContent>
    </Card>
  );
}

function QueryResultsPanel({
  loading,
  result,
  embedded,
  floating,
}: {
  loading: boolean;
  result: QueryResponse | null;
  embedded?: boolean;
  floating?: boolean;
}) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center gap-3 rounded-md border border-border/60 bg-muted/30 px-4 py-6",
          "text-sm text-muted-foreground"
        )}
        role="status"
        aria-live="polite"
        aria-busy
      >
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden />
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium text-foreground">Running query…</p>
          <p className="text-xs">This can take a few seconds — results will appear below.</p>
        </div>
      </div>
    );
  }

  const hasRows = Boolean(result?.rows?.length);
  const showChart =
    result?.chart && chartHasRenderableData(result.chart, result.rows);

  if (!hasRows && !showChart) return null;

  const cols = result!.columns.map((c) => c.name);
  const tableRows = hasRows ? result!.rows.slice(0, MAX_TABLE_ROWS) : [];

  return (
    <div className="flex shrink-0 flex-col gap-3">
      {hasRows ? (
        <div
          className={cn(
            "rounded-md border overflow-x-auto",
            embedded && "max-h-48 overflow-y-auto"
          )}
        >
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                {cols.map((c) => (
                  <th key={c} className="text-left p-2 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  {cols.map((c) => (
                    <td key={c} className="p-2 max-w-[240px] truncate">
                      {formatCell(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {result!.rows.length > MAX_TABLE_ROWS && (
            <p className="p-2 text-muted-foreground text-xs">
              Showing first {MAX_TABLE_ROWS} of {result!.rows.length} rows.
            </p>
          )}
        </div>
      ) : null}

      {showChart && result ? (
        <QueryChart chart={result.chart!} rows={result.rows} />
      ) : null}
    </div>
  );
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Strip legacy ```sql fences from content (older messages) and return body + SQL. */
function parseSqlFenceFromContent(content: string): { body: string; sql?: string } {
  const re = /```sql\n([\s\S]*?)```/;
  const m = content.match(re);
  if (!m) return { body: content };
  return {
    body: content.replace(re, "").trim(),
    sql: m[1].trim(),
  };
}

function AssistantMessageBody({ message }: { message: ChatMessage }) {
  const legacy = message.sql ? null : parseSqlFenceFromContent(message.content);
  const sql = message.sql ?? legacy?.sql;
  const text = message.sql ? message.content : legacy?.body ?? message.content;

  return (
    <div className="space-y-3">
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/95">{text}</div>
      {sql ? <SqlBlock sql={sql} /> : null}
    </div>
  );
}

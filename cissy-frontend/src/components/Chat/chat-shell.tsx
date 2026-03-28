"use client";

import { useId, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MessageCircle, Sparkles } from "lucide-react";
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
  setConversationId,
  type ChatMessage,
} from "@/redux/features/conversationSlice";
import { postQuery } from "@/services/api";
import type { QueryResponse } from "@/types/api";
import { cn } from "@/lib/utils/cn";

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
  const { messages, conversationId } = useSelector(
    (s: RootState) => s.conversation
  );
  const formId = useId();
  const [lastResult, setLastResult] = useState<QueryResponse | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    dispatch(clearMessages());
    setLastResult(null);
    setDraft("");
    dispatch(setConversationId(routeJobId ?? null));
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

    try {
      const res = await postQuery({
        message: trimmed,
        conversationId: conversationId ?? undefined,
      });
      setLastResult(res);
      if (res.job_id) {
        dispatch(setConversationId(res.job_id));
      }
      if (res.error) {
        toast.error(res.error);
      }
      const assistantText = [
        res.insight,
        res.sql ? `\n\n\`\`\`sql\n${res.sql}\n\`\`\`` : "",
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
          createdAt: Date.now(),
        })
      );
    } catch (e) {
      setLastResult(null);
      toast.error(e instanceof Error ? e.message : "Request failed");
    }
  }

  async function onSubmitForm(formData: FormData) {
    const text = String(formData.get("message") ?? "").trim();
    await submitMessage(text);
    const form = document.getElementById(formId) as HTMLFormElement;
    form?.reset();
  }

  const shell = (
    <>
      {floating && messages.length === 0 ? (
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
            Ask anything about your Instacart-style data — metrics, joins, and SQL
            insights.
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
      ) : null}

      <div
        className={cn(
          "rounded-md border bg-muted/30 p-3 sm:p-4 overflow-y-auto space-y-3 text-sm min-h-[160px]",
          embedded || floating
            ? "flex-1 min-h-0 max-h-none border-border/60"
            : "max-h-[420px]",
          floating && messages.length === 0 && "min-h-[120px]"
        )}
      >
        {!floating && messages.length === 0 ? (
          <p className="text-muted-foreground">
            Ask a question in plain English. The FastAPI backend (DuckDB) should
            expose <code className="text-xs">POST /query</code>.
          </p>
        ) : null}
        {messages.length > 0
          ? messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-6 rounded-lg bg-primary/10 p-3 sm:ml-8"
                    : "mr-6 rounded-lg bg-secondary p-3 whitespace-pre-wrap sm:mr-8"
                }
              >
                {m.content}
              </div>
            ))
          : null}
      </div>

      {floating ? (
        <form
          id={formId}
          className="flex shrink-0 flex-col gap-2"
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
            <Button type="submit">Send</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                dispatch(routeJobId ? clearThreadMessages() : clearMessages());
                setLastResult(null);
                setDraft("");
              }}
            >
              Clear
            </Button>
          </div>
        </form>
      ) : (
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
            <Button type="submit">Send</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                dispatch(routeJobId ? clearThreadMessages() : clearMessages());
                setLastResult(null);
              }}
            >
              Clear
            </Button>
          </div>
        </form>
      )}

      <ResultsPreview
        result={lastResult}
        embedded={embedded}
        floating={floating}
      />
    </>
  );

  if (floating) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
        {!routeJobId ? (
          <p className="shrink-0 text-xs text-amber-700 dark:text-amber-400">
            Missing job scope — reload the page.
          </p>
        ) : null}
        {shell}
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

function ResultsPreview({
  result,
  embedded,
  floating,
}: {
  result: QueryResponse | null;
  embedded?: boolean;
  floating?: boolean;
}) {
  if (!result?.rows?.length) return null;
  const cols = result.columns.map((c) => c.name);
  const rows = result.rows.slice(0, MAX_TABLE_ROWS);

  return (
    <div
      className={cn(
        "rounded-md border overflow-x-auto shrink-0",
        (embedded || floating) && "max-h-48 overflow-y-auto"
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
          {rows.map((row, i) => (
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
      {result.rows.length > MAX_TABLE_ROWS && (
        <p className="p-2 text-muted-foreground text-xs">
          Showing first {MAX_TABLE_ROWS} of {result.rows.length} rows.
        </p>
      )}
    </div>
  );
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

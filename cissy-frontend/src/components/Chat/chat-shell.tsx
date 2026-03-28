"use client";

import { useId, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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

type ChatShellProps = {
  /** When set (e.g. from `/bi/[jobId]`), scopes queries to this conversation. */
  routeJobId?: string | null;
};

export function ChatShell({ routeJobId = null }: ChatShellProps) {
  const dispatch = useDispatch();
  const { messages, conversationId } = useSelector(
    (s: RootState) => s.conversation
  );
  const formId = useId();
  const [lastResult, setLastResult] = useState<QueryResponse | null>(null);

  useEffect(() => {
    dispatch(clearMessages());
    setLastResult(null);
    dispatch(setConversationId(routeJobId ?? null));
  }, [dispatch, routeJobId]);

  async function onSubmit(formData: FormData) {
    const text = String(formData.get("message") ?? "").trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    dispatch(addMessage(userMsg));

    try {
      const res = await postQuery({
        message: text,
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

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">Conversation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-4 min-h-[200px] max-h-[420px] overflow-y-auto space-y-3 text-sm">
          {messages.length === 0 ? (
            <p className="text-muted-foreground">
              Ask a question in plain English. The FastAPI backend (DuckDB)
              should expose <code className="text-xs">POST /query</code>.
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-8 rounded-lg bg-primary/10 p-3"
                    : "mr-8 rounded-lg bg-secondary p-3 whitespace-pre-wrap"
                }
              >
                {m.content}
              </div>
            ))
          )}
        </div>
        <form
          action={async (fd) => {
            await onSubmit(fd);
            const form = document.getElementById(formId) as HTMLFormElement;
            form?.reset();
          }}
          id={formId}
          className="flex flex-col gap-2"
        >
          <Textarea
            name="message"
            placeholder="e.g. Top 10 departments by reorder rate"
            rows={3}
          />
          <div className="flex gap-2">
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
        <ResultsPreview result={lastResult} />
      </CardContent>
    </Card>
  );
}

function ResultsPreview({ result }: { result: QueryResponse | null }) {
  if (!result?.rows?.length) return null;
  const cols = result.columns.map((c) => c.name);
  const rows = result.rows.slice(0, MAX_TABLE_ROWS);

  return (
    <div className="rounded-md border overflow-x-auto">
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

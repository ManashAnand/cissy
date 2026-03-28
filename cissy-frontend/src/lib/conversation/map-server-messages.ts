import type { ChatMessage } from "@/redux/features/conversationSlice";
import type { QueryResponse } from "@/types/api";
import type { MessageItem, MessagesListResponse } from "@/types/conversation-messages";

/** Backend may return `{ messages: [...] }` or a raw array of `MessageItem`. */
function getMessageItems(
  data: MessagesListResponse | MessageItem[] | null
): MessageItem[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  return Array.isArray(data.messages) ? data.messages : [];
}

function toChatMessage(m: MessageItem): ChatMessage {
  const sql =
    m.role === "assistant" &&
    m.meta &&
    typeof (m.meta as { sql?: unknown }).sql === "string"
      ? (m.meta as { sql: string }).sql
      : undefined;
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: Number.isFinite(Date.parse(m.created_at))
      ? Date.parse(m.created_at)
      : Date.now(),
    sql,
  };
}

/** Rebuild a minimal `QueryResponse` for table/chart preview from the last assistant `meta` (rows may be absent). */
function buildLastQueryPreview(items: MessageItem[]): QueryResponse | null {
  const assistants = items.filter((m) => m.role === "assistant");
  const last = assistants[assistants.length - 1];
  if (!last?.meta) return null;
  const meta = last.meta;
  const hasPreview =
    (typeof meta.sql === "string" && meta.sql.length > 0) ||
    meta.chart != null ||
    meta.error != null;
  if (!hasPreview) return null;
  return {
    job_id: last.job_id,
    sql: typeof meta.sql === "string" ? meta.sql : undefined,
    columns: [],
    rows: [],
    chart: meta.chart,
    insight: last.content,
    error: meta.error === null || meta.error === undefined ? undefined : String(meta.error),
  };
}

export function mapMessagesResponse(
  data: MessagesListResponse | MessageItem[] | null
): {
  messages: ChatMessage[];
  lastQueryResult: QueryResponse | null;
} {
  const items = getMessageItems(data);
  if (!items.length) {
    return { messages: [], lastQueryResult: null };
  }
  return {
    messages: items.map(toChatMessage),
    lastQueryResult: buildLastQueryPreview(items),
  };
}

import type { ChartSpec } from "@/types/api";

/** Optional payload persisted with assistant turns after `/query`. */
export type MessageItemMeta = {
  sql?: string;
  error?: string | null;
  chart?: ChartSpec;
  row_count?: number;
  [key: string]: unknown;
};

export type MessageItem = {
  id: string;
  job_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  meta?: MessageItemMeta | null;
};

export type MessagesListResponse = {
  messages: MessageItem[];
};

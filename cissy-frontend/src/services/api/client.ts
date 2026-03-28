import type {
  ConversationSummary,
  ConversationsListResponse,
  CreateConversationResponse,
} from "@/types/conversations";
import type { QueryRequest, QueryResponse } from "@/types/api";

const getBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    console.warn("NEXT_PUBLIC_API_URL is not set; API calls will fail.");
  }
  return url ?? "";
};

const missingBaseError = () =>
  new Error(
    "NEXT_PUBLIC_API_URL is not set. Add it to .env.local (e.g. NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1), restart next dev, and ensure FastAPI is running."
  );

function isProbablyHtml(body: string) {
  const t = body.trimStart();
  return t.startsWith("<!DOCTYPE") || t.startsWith("<html");
}

function errorFromFailedResponse(status: number, body: string): Error {
  if (isProbablyHtml(body)) {
    return new Error(
      `Got HTML instead of JSON (${status}). The browser called the Next.js app (wrong host/path), not your FastAPI server. Set NEXT_PUBLIC_API_URL to the API base including /api/v1, e.g. http://localhost:8000/api/v1`
    );
  }
  return new Error(body || `Request failed: ${status}`);
}

type FetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const base = getBaseUrl().replace(/\/$/, "");
  if (!base) {
    throw missingBaseError();
  }
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    body:
      options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });

  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    const text = await res.text();
    throw errorFromFailedResponse(res.status, text);
  }

  if (contentType.includes("text/html")) {
    const text = await res.text();
    throw errorFromFailedResponse(res.status, text);
  }

  return res.json() as Promise<T>;
}

/** Natural-language → DuckDB (via backend). Sends `job_id` for thread scope. */
export function postQuery(body: QueryRequest) {
  const { conversationId, message } = body;
  const payload: Record<string, unknown> = { message };
  if (conversationId) {
    payload.job_id = conversationId;
    payload.conversationId = conversationId;
  }
  return apiFetch<QueryResponse>("/query", {
    method: "POST",
    body: payload,
  });
}

/** Optional: backend health for status indicator. */
export function getHealth() {
  return apiFetch<{ status: string }>("/health", { method: "GET" });
}

/** List BI conversation threads for the dashboard. */
export async function getConversations() {
  const data = await apiFetch<ConversationsListResponse | ConversationSummary[]>(
    "/conversations",
    { method: "GET" }
  );
  if (Array.isArray(data)) {
    return { conversations: data };
  }
  return data;
}

/** Create an empty conversation; returns job_id for /bi/[job_id]. */
export function postConversation(body?: { label?: string }) {
  return apiFetch<CreateConversationResponse>("/conversations", {
    method: "POST",
    body: body ?? {},
  });
}

/** Remove a conversation thread and its messages. Backend returns 204 or empty body. */
export async function deleteConversation(jobId: string): Promise<void> {
  const base = getBaseUrl().replace(/\/$/, "");
  if (!base) {
    throw missingBaseError();
  }
  const url = `${base}/conversations/${encodeURIComponent(jobId)}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw errorFromFailedResponse(res.status, text);
  }
}

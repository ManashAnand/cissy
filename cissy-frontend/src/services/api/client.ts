import type { QueryRequest, QueryResponse } from "@/types/api";

const getBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    console.warn("NEXT_PUBLIC_API_URL is not set; API calls will fail.");
  }
  return url ?? "";
};

type FetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const base = getBaseUrl().replace(/\/$/, "");
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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

/** Natural-language → DuckDB (via backend). */
export function postQuery(body: QueryRequest) {
  return apiFetch<QueryResponse>("/query", { method: "POST", body });
}

/** Optional: backend health for status indicator. */
export function getHealth() {
  return apiFetch<{ status: string }>("/health", { method: "GET" });
}

# `job_id` on the frontend (cissy-frontend)

This document describes how **`job_id`** scopes the conversational BI experience in the Next.js app: URLs, client state, and API calls. It aligns with the mental model in [`job_id_source_of_truth.md`](./job_id_source_of_truth.md) (one canonical id per scoped “job”), adapted for **single-user, unauthenticated** usage.

---

## What `job_id` means here

- **`job_id`** is the **primary key of a conversation** in the backend (a UUID string).
- One **`job_id`** = one chat thread. All messages sent while that thread is active share the same **`job_id`**.
- There is **no `user_id`** in the first version: we assume a single operator on localhost; the backend may still reserve a place for `user_id` later.

In TypeScript/React we use **`jobId`** (camelCase) in props, hooks, and route params, matching the convention in `job_id_source_of_truth.md`.

---

## Routing

| Route | Purpose |
|-------|---------|
| **`/bi`** | Dashboard: list existing conversations, action to **start a new chat**. |
| **`/bi/[jobId]`** | Active chat for that conversation. All queries in this view send **`job_id` = `jobId`** to the API. |

**Intended flow**

1. **New chat** — Generate a new UUID (client- or server-issued per backend contract), persist the conversation row, then navigate to **`/bi/{jobId}`**.
2. **Resume** — User picks a row on the dashboard; navigate to **`/bi/{jobId}`**.
3. **Direct link** — Opening `/bi/{jobId}` loads that thread if it exists.

The URL is the **bookmarkable** source of which conversation is active; Redux (or React state) should stay **in sync** with the route so refreshes and deep links behave correctly.

---

## Client state (Redux)

The **`conversation`** slice holds:

- **`conversationId`** — Should match **`job_id`** for the active thread. Prefer renaming or documenting that **`conversationId` ≡ `job_id`** to avoid confusion.
- **`messages`** — UI history for the current view; the **authoritative** history for persistence is the backend (see backend doc).

**Rules**

1. When the route is **`/bi/[jobId]`**, set **`conversationId`** to that **`jobId`** on mount (and clear or replace when the route changes).
2. On first **`POST /query`** for a brand-new thread, the backend returns **`job_id`**; dispatch **`setConversationId`** so follow-up messages include it.
3. **`Clear`** in the UI should reset local messages; whether it deletes the server conversation is a product decision (document in backend contract).

---

## API usage from the client

Natural-language queries use **`POST /query`** with a body shaped like:

```ts
{
  message: string;
  conversationId?: string; // maps to backend job_id; omit for first message of a server-created thread if backend assigns id
}
```

The client should send **`conversationId`** whenever the user is inside a known **`/bi/[jobId]`** route so the backend can attach the message to the correct conversation and load prior context.

See [`job_id_backend_contract.md`](./job_id_backend_contract.md) for the exact JSON field names the backend may standardize on (`job_id` vs `conversation_id`).

---

## Naming: `job_id` vs `jobId` vs `conversationId`

| Context | Name |
|---------|------|
| URL segment, DB column, raw JSON from API | `job_id` |
| React/TS variables, props | `jobId` |
| Redux field today | `conversationId` (same value as `job_id`; consider aliasing in code comments or renaming in a later refactor) |

**Do not** use a message id or SQL row id from a result set as **`job_id`**. **`job_id`** identifies the **conversation**, not an individual assistant reply.

---

## UI surfaces

- **Dashboard (`/bi`)** — Lists conversations (from **`GET`** API); each item shows label, **`updated_at`**, link to **`/bi/{jobId}`**.
- **Chat (`/bi/[jobId]`)** — **`ChatShell`** (or equivalent) reads **`jobId`** from the router, syncs Redux, calls **`postQuery`** with that id.

---

## Related files (evolving)

- `src/types/api.ts` — `QueryRequest.conversationId` should align with backend **`job_id`**.
- `src/redux/features/conversationSlice.ts` — `conversationId` / `setConversationId`.
- `src/services/api/client.ts` — `postQuery`.
- `src/components/Chat/chat-shell.tsx` — Sends `conversationId` on each query.

Update this doc when routes are added under `src/app/(app)/bi/` and when field names are unified (`jobId` in Redux vs `conversationId`).

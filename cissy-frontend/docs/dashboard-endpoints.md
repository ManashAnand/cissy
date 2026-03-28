# Dashboard page — API endpoints, payloads, and responses

This document describes what the **dashboard** (`/`, home) calls today: paths are **relative to `NEXT_PUBLIC_API_URL`**. In development, set that to your API root including the version prefix, for example:

`NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`

So the dashboard hits `GET http://localhost:8000/api/v1/conversations`, not `/api/v1` twice.

See also [`backend-changes.md`](./backend-changes.md) and [`job_id_backend_contract.md`](./job_id_backend_contract.md).

### Troubleshooting: HTML / 404 in the error message

If you see **`<!DOCTYPE html>`** or **Next.js “404: This page could not be found”** in the dashboard error banner, the browser requested **`/conversations` on the Next.js origin** (e.g. `http://localhost:3000/conversations`) instead of your API. That happens when:

1. **`NEXT_PUBLIC_API_URL` is unset** — the client used to build a relative URL; the app now refuses to call the API until the variable is set.
2. **The variable points at the wrong host** — e.g. still `http://localhost:3000` or missing **`/api/v1`**.

**Fix:** Create `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` (adjust port to your FastAPI), **restart** `next dev`, and ensure the backend is running.

---

## Endpoints used on the dashboard

| Method | Path | Purpose |
|--------|------|---------|
| **GET** | `/conversations` | Load the **Your projects** list and derive stat card counts client-side. Prefer **`{ "conversations": [...] }`**; sort **`updated_at` descending**; ISO 8601 timestamps; **`label`** may be `null`. |
| **POST** | `/conversations` | **New chat** — create an empty thread, then the app navigates to `/bi/{job_id}`. Body optional (`{}` or `{ "label": "New chat" }`). |
| **DELETE** | `/conversations/{job_id}` | **Delete** on each project card — removes the thread and messages; **404** if unknown `job_id`. Response typically **204 No Content**. |

The dashboard does **not** call `POST /query`; that is used on **`/bi/[jobId]`** after navigation.

**Optional:** `GET /dashboard` — server aggregates for stats + cards (not used yet; stats still come from client-side derivation on `GET /conversations`).

**Request headers (all calls)**

- `Content-Type: application/json` for **POST** bodies (the client sets this for JSON `fetch`).

---

## `GET /conversations`

**Payload:** none (no query body).

**Expected successful response (preferred shape)**

```json
{
  "conversations": [
    {
      "job_id": "550e8400-e29b-41d4-a716-446655440000",
      "label": "Reorder analysis",
      "updated_at": "2026-03-28T15:00:00.000Z",
      "created_at": "2026-03-27T10:00:00.000Z"
    }
  ]
}
```

**Alternate shape (also supported by the frontend)**

The client normalizes a bare array to `{ conversations: [...] }`:

```json
[
  {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "label": "Reorder analysis",
    "updated_at": "2026-03-28T15:00:00.000Z",
    "created_at": "2026-03-27T10:00:00.000Z"
  }
]
```

**TypeScript shape (frontend)**

```ts
type ConversationSummary = {
  job_id: string;
  label: string | null;
  updated_at: string; // ISO 8601
  created_at: string; // ISO 8601
};

type ConversationsListResponse = {
  conversations: ConversationSummary[];
};
```

**Sorting:** The UI works with any order; the product expectation is **newest activity first** (`updated_at` descending), matching [`backend-changes.md`](./backend-changes.md).

**Errors:** Non-2xx responses: the client throws; the dashboard shows an error banner with the response text.

---

## `POST /conversations`

**Payload (JSON body)**

Optional. Empty object `{}` is valid.

```json
{
  "label": "New chat"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `label` | `string` | No | Suggested title for the thread; frontend sends `"New chat"` when creating from the dashboard. |

**Expected successful response**

```json
{
  "job_id": "660e8400-e29b-41d4-a716-446655440001",
  "label": "New chat",
  "created_at": "2026-03-28T16:00:00.000Z"
}
```

**TypeScript shape (frontend)**

```ts
type CreateConversationResponse = {
  job_id: string;
  label?: string | null;
  created_at?: string;
};
```

**Behavior after success:** The app calls `router.push(\`/bi/${job_id}\`)` so the user lands in chat scoped to that `job_id`.

**Errors:** Non-2xx: thrown; **New chat** shows a toast with the error message.

---

## `DELETE /conversations/{job_id}`

**Payload:** none.

**Path parameter:** `job_id` — URL-encoded UUID (same as `conversation.job_id` in the list).

**Expected successful response:** **204 No Content** or empty body (the frontend does not require a JSON body).

**Errors**

- **404** — Unknown `job_id`; shown as a toast with the API error text.

**Frontend behavior**

1. User clicks **Delete** on a project card and confirms in the browser `confirm()` dialog.
2. Client calls `DELETE` with `fetch` (see `deleteConversation` in `src/services/api/client.ts`).
3. On success, **TanStack Query** invalidates `["conversations"]` so the list and stat cards refresh.
4. **Toast:** success or error message.

---

## How the dashboard uses this data

- **Stat cards** — Counts are **derived in the browser** from `conversations` (totals, inferred status buckets for Active / Completed / Pending). There is **no** separate “dashboard metrics” endpoint yet.
- **Project cards** — One card per `ConversationSummary`; **search** filters by `label` and `job_id` substring; **status filter** uses heuristics from `updated_at` until the API adds a real `status` field; **Delete** calls **`DELETE /conversations/{job_id}`**.
- **Optional future endpoint** — If you need exact “documents processed” or “average processing time” without heuristics, add something like `GET /dashboard/metrics` later; the current UI does not call it.

---

## Related: chat page (`/bi/[jobId]`) — not the dashboard

After opening a thread, the client uses **`POST /query`** with `message` and `job_id` (see [`job_id_backend_contract.md`](./job_id_backend_contract.md) and `src/services/api/client.ts`). That flow is separate from the dashboard list above.

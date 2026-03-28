# Dashboard page — API endpoints, payloads, and responses

This document describes what the **dashboard** (`/`, home) calls today: paths are **relative to `NEXT_PUBLIC_API_URL`**. In development, set that to your API root including the version prefix, for example:

`NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`

So the dashboard hits `GET http://localhost:8000/api/v1/conversations`, not `/api/v1` twice.

See also [`backend-changes.md`](./backend-changes.md) and [`job_id_backend_contract.md`](./job_id_backend_contract.md).

---

## Endpoints used on the dashboard

| Method | Path | Purpose |
|--------|------|---------|
| **GET** | `/conversations` | Load the **Your projects** list and derive stat card counts client-side. |
| **POST** | `/conversations` | **New chat** — create an empty thread, then the app navigates to `/bi/{job_id}`. |
| **DELETE** | `/conversations/{job_id}` | Remove a conversation (project card) and all its messages — **204** on success. |

The dashboard does **not** call `POST /query`; that is used on **`/bi/[jobId]`** after navigation.

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

## How the dashboard uses this data

- **Stat cards** — Counts are **derived in the browser** from `conversations` (totals, inferred status buckets for Active / Completed / Pending). There is **no** separate “dashboard metrics” endpoint yet.
- **Project cards** — One card per `ConversationSummary`; **search** filters by `label` and `job_id` substring; **status filter** uses heuristics from `updated_at` until the API adds a real `status` field.
- **Optional future endpoint** — If you need exact “documents processed” or “average processing time” without heuristics, add something like `GET /dashboard/metrics` later; the current UI does not call it.

---

## Related: chat page (`/bi/[jobId]`) — not the dashboard

After opening a thread, the client uses **`POST /query`** with `message` and `job_id` (see [`job_id_backend_contract.md`](./job_id_backend_contract.md) and `src/services/api/client.ts`). That flow is separate from the dashboard list above.

---

## Backend implementation (Cissy FastAPI)

The backend exposes these routes under **`/api/v1`** (same paths as in the table above when `NEXT_PUBLIC_API_URL` includes `/api/v1`):

| Method | Path | Notes |
|--------|------|--------|
| GET | `/conversations` | Returns **`{ "conversations": ConversationSummary[] }`** (preferred shape). Sort: **`updated_at` descending**. Timestamps are **ISO 8601 UTC with milliseconds** (e.g. `2026-03-28T15:00:00.000Z`). **`label`** may be `null`. |
| POST | `/conversations` | Body optional (`{}` or `{ "label": "New chat" }`). Response: **`job_id`**, **`label`**, **`created_at`**. |
| DELETE | `/conversations/{job_id}` | Deletes the thread and messages; **404** if unknown `job_id`. |
| POST | `/query` | Chat page — **`message`** + optional **`job_id`** / **`conversationId`**. |
| GET | `/dashboard` | **Optional** — full stats + project cards + **`job_ids`** if the UI switches from client-derived stats to server aggregates. |

**CORS** is enabled for browser `fetch` from local Next.js (adjust `allow_origins` in production).

**OpenAPI:** `GET /docs` on the API host lists request/response schemas.

# Backend contract: `job_id` and conversations

This document describes what **cissy-frontend** expects from the FastAPI (or other) backend for **conversation-scoped** BI chat. It pairs with [`job_id_frontend.md`](./job_id_frontend.md).

**Scope:** single-tenant / no authentication in v1; one implicit user. The schema can add **`user_id`** later without changing the **`job_id`** rules.

---

## Why we use `job_id` (and what we intend)

### Naming and alignment

We deliberately reuse **`job_id`** (the same term as in [`job_id_source_of_truth.md`](./job_id_source_of_truth.md)) even though this product is **conversational BI**, not Cissy pipelines. In that doc, **`job_id`** is the **single stable identifier** for everything tied to one unit of work: chat, exports, and downstream APIs. Here, **one conversation thread** is that unit of work: one **`job_id`** scopes **all messages**, **stored context**, and **follow-up questions** for that thread.

Using one name avoids inventing a second concept (`session_id` vs `thread_id` vs `job_id`) that would mean the same thing in practice and confuse API consumers.

### What we are trying to achieve

1. **Clear boundaries** — Every request that should continue an existing line of questioning must carry the same **`job_id`**. Requests without it (per product rules) start a **new** conversation. That makes behavior predictable for both the backend and the UI.
2. **Follow-up questions** — BI questions are rarely one-shot; users ask refinements (“same chart but only produce”, “compare to last query”). The backend needs a **durable key** to load prior turns and optional NL→SQL state. **`job_id`** is that key.
3. **Dashboard and resume** — The user can open **multiple parallel conversations** (e.g. “basket analysis” vs “department KPIs”). Each row on the dashboard is one **`job_id`**; opening **`/bi/{job_id}`** always returns to the **same** history, not a mix of unrelated chats.
4. **Separation from analytics data** — Instacart (or other) tables live in DuckDB and are **not** keyed by **`job_id`**. **`job_id`** exists only in **application metadata** (conversations, messages, optional caches). That keeps warehouse SQL simple and avoids polluting analytical schemas with chat identifiers unless we explicitly choose to log them.

### What `job_id` is not

- It is **not** a DuckDB primary key for `orders` or `products`.
- It is **not** a single message id: each message has its own id; **`job_id`** groups many messages.
- In v1 it is **not** tied to login: we still use **`job_id`** so the **same** contract works when **`user_id`** is added later (each user will own many **`job_id`** values).

---

## Core idea

- **`job_id`** is a **UUID** string that identifies one **conversation** (one chat thread).
- Every **message** (user or assistant) for that thread is stored and retrieved using **`job_id`**.
- The **DuckDB / SQL** side is unchanged: analytics queries run against the Instacart (or other) dataset; **`job_id`** only scopes **chat history** and **LLM context**, not warehouse table names.

---

## Data model (expected)

### Table: `conversations` (or `jobs` if you prefer parity with internal naming)

| Column | Type | Notes |
|--------|------|--------|
| **`id`** | UUID (PK) | **This is `job_id`.** Returned in API responses as `job_id`. |
| **`label`** | text, nullable | User-facing title; default e.g. `"New chat"` or first line of first message. |
| **`created_at`** | timestamptz | |
| **`updated_at`** | timestamptz | Touch on each new message for dashboard sorting. |
| **`parent_conversation_id`** | UUID, nullable, FK | Optional: fork/version of another conversation. Omit in v1 if unused. |

No **`user_id`** required for v1.

### Table: `messages` (or equivalent)

| Column | Type | Notes |
|--------|------|--------|
| **`id`** | UUID (PK) | Per-message id; **not** `job_id`. |
| **`job_id`** | UUID (FK → `conversations.id`) | |
| **`role`** | enum/text | `user` \| `assistant` (and optional `system`). |
| **`content`** | text | User text or assistant markdown/plain. |
| **`created_at`** | timestamptz | |
| Optional | JSON | `sql`, `error`, `columns`, `rows_preview`, `chart` for audit/replay |

---

## API endpoints

### `POST /query`

Runs the NL → SQL → DuckDB pipeline for one user turn.

**Request body (minimum)**

```json
{
  "message": "Top 10 departments by reorder rate",
  "job_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Naming note:** The frontend currently sends **`conversationId`** in TypeScript; align on a single JSON key:

- Prefer **`job_id`** in JSON for consistency with this doc and `job_id_source_of_truth.md`, **or**
- Accept **`conversation_id`** as an alias with the same semantics.

If **`job_id` is omitted**:

- **Option A** — Backend creates a new `conversations` row, generates **`job_id`**, persists the user message, runs the query, returns **`job_id`** in the response so the client can navigate to **`/bi/{job_id}`**.
- **Option B** — Backend returns **400** if the client must always create the conversation first via **`POST /conversations`** (see below). Choose one approach and document it.

**Response body (extends query result)**

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "sql": "SELECT ...",
  "columns": [{ "name": "department", "type": "VARCHAR" }],
  "rows": [],
  "chart": { "type": "bar", "xKey": "department", "yKey": "rate" },
  "insight": "Short natural language summary.",
  "error": null
}
```

- Always echo **`job_id`** when known so the client can sync Redux/URL.
- On failure after retries, set **`error`** and still return **`job_id`** if the conversation exists.

### `GET /conversations` (or `GET /jobs`)

Returns the dashboard list for the single user.

**Response (example)**

```json
{
  "conversations": [
    {
      "job_id": "550e8400-e29b-41d4-a716-446655440000",
      "label": "Reorder analysis",
      "updated_at": "2026-03-28T12:00:00Z",
      "created_at": "2026-03-27T10:00:00Z"
    }
  ]
}
```

Sort by **`updated_at`** descending by default.

### `POST /conversations` (optional if `POST /query` creates conversations)

Creates an empty conversation and returns **`job_id`** for redirect to **`/bi/{job_id}`**.

**Request**

```json
{ "label": "Optional initial label" }
```

**Response**

```json
{ "job_id": "...", "label": "New chat", "created_at": "..." }
```

### `GET /conversations/{job_id}/messages` (optional)

Returns message history for hydrating the UI on full page load (if not bundled into `POST /query` responses).

---

## Behavioral expectations

1. **Idempotency** — Sending the same **`job_id`** on repeated **`POST /query`** calls appends new user/assistant messages to that conversation only.
2. **Context** — For each turn, the backend may load prior messages for **`job_id`** to support follow-ups (“now filter to organic only”).
3. **DuckDB** — Connection path and CSV loading are independent of **`job_id`**; **`job_id`** does not need to appear inside SQL against Instacart tables unless you explicitly add it for logging.

---

## Health check

`GET /health` — As today; no **`job_id`** required.

---

## Versioning

When the JSON shape stabilizes, bump an **`API-Version`** header or document **`/v1/query`** if breaking changes are introduced (e.g. renaming `conversationId` → `job_id` in the wire format).

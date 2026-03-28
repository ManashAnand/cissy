# Conversation API structure (`job_id`) — Cissy backend

This document describes how **`/api/v1`** routes, **`job_id`**, and **DuckDB** fit together. It implements the contract in [`job_id_usage.md`](./job_id_usage.md).

## Layers

```
HTTP (/api/v1/…)
  ├── health.py          → GET  /health
  ├── conversations.py   → GET/POST /conversations, GET /conversations/{job_id}/messages
  ├── query.py           → POST /query  (NL turn; NL→SQL stub for now)
  └── bi.py              → GET  /bi/ready, /bi/schema, /bi/preview/…, POST /bi/query (raw SQL dev)
       └── services/
             ├── app_schema.py        → DDL: conversations, messages
             ├── conversation_service.py → CRUD for threads + messages
             ├── instacart_dataset.py  → Instacart CSV views (analytics)
             └── bi_service.py         → Safe SELECT + schema introspection
       └── db/duckdb.py               → Single DuckDB file (`data/instacart.duckdb`) + :memory: in tests
```

## Data: two concerns in one DuckDB file

| Area | Tables / views | Purpose |
|------|----------------|---------|
| **App / chat** | `conversations`, `messages` | **`job_id`** lives here only — one row per conversation in `conversations.id`, many messages per `messages.job_id`. |
| **Analytics** | `aisles`, `orders`, `products`, … (views over CSV) | Instacart; **no** `job_id` column. |

`job_id` is a **UUID string** (same as `conversations.id`). It does **not** appear in warehouse SQL unless you add optional logging later.

## Endpoints (all prefixed with `/api/v1`)

| Method | Path | Role |
|--------|------|------|
| GET | `/health` | Liveness / version |
| GET | `/dashboard` | **Stats (four cards) + all `projects` (per `job_id`) + `job_ids` list** — single payload for the BI dashboard UI |
| GET | `/conversations` | Conversation list; sort `updated_at` desc |
| DELETE | `/conversations/{job_id}` | Delete conversation + messages (**204**) |
| POST | `/conversations` | Create empty chat; returns `job_id` |
| GET | `/conversations/{job_id}/messages` | Full thread history |
| POST | `/query` | User message + optional `job_id` / `conversationId`; creates thread if omitted (Option A) |
| GET | `/bi/ready` | DuckDB probe |
| GET | `/bi/schema` | Warehouse column catalog |
| GET | `/bi/preview/{dataset}` | `SELECT * … LIMIT` for one CSV-backed view |
| POST | `/bi/query` | Raw read-only SQL (validated) |

## `POST /query` body (JSON)

```json
{
  "message": "Top departments by reorder rate",
  "job_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

- Omit **`job_id`** → new conversation, new **`job_id`** in response.
- **`conversationId`** is accepted as an alias for **`job_id`** (camelCase, frontend-friendly).

Response shape matches **`job_id_usage.md`** (`sql`, `columns`, `rows`, `chart`, `insight`, `error`). Until NL→SQL is wired, **`sql`** / **`rows`** may be empty and **`insight`** is a stub message.

## Single user, multiple conversations (v1)

There is **no** `user_id` yet. Every row in **`conversations`** is one thread; one implicit user may have **many** `job_id` values. Adding **`user_id`** later only requires a column + filter on list endpoints.

## Files (reference)

| File | Responsibility |
|------|----------------|
| `app/services/app_schema.py` | `ensure_app_tables()` on startup |
| `app/services/conversation_service.py` | Create/list conversations; append/list messages |
| `app/models/pydantic/conversation.py` | Request/response models for chat routes |
| `app/routers/conversations.py` | Conversation HTTP API |
| `app/routers/query.py` | `POST /query` |
| `app/server.py` | Lifespan: DuckDB → app tables → Instacart views |

## Versioning

Breaking JSON changes should bump **`API-Version`** or move to **`/api/v2`** per product rules.

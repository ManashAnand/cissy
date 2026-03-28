# Plan: Natural language → SQL → polished BI results

**Status:** Core pipeline is implemented (OpenAI SQL + insight, DuckDB execution, chart heuristics, allowlisted tables). See [`nl_sql_implementation_steps.md`](./nl_sql_implementation_steps.md) for a plain-English walkthrough of what was built.

This document is the **implementation plan** for the core Conversational BI flow: the user sends **plain English** on **`POST /api/v1/query`**, the backend **generates and runs DuckDB SQL**, and returns a **polished** response (**table + chart + short insight**), scoped by **`job_id`** for history and follow-ups.

**Related docs:** [`job_id_usage.md`](./job_id_usage.md), [`conversation_api_structure.md`](./conversation_api_structure.md), Instacart views in `app/services/instacart_dataset.py`.

---

## 1. Goal

| Input | Output |
|--------|--------|
| `message` (natural language) + optional `job_id` / `conversationId` | **`sql`**, **`columns`** (name + type), **`rows`**, **`chart`** (type + keys), **`insight`** (plain English), **`error`** (if failed after retries) |

**Polish** means: structured JSON the frontend can render without parsing raw SQL; human-readable insight; chart hints when the result shape fits; safe execution (no destructive SQL).

---

## 2. Current state vs target

| Area | Today | Target |
|------|--------|--------|
| `POST /query` | Persists messages; returns stub **`insight`**, empty **`sql` / rows / chart`** | Full pipeline: NL → SQL → execute → shape response |
| DuckDB | Instacart **views** over CSVs; `GET /bi/schema`; safe `POST /bi/query` | Same engine; NL path uses **allowlisted** views only |
| Memory | Messages stored per **`job_id`** | Load last turns (+ optional last SQL / result summary) into LLM context |
| Charts | N/A | Rule-based or LLM-assisted **`chart`** object in response |

---

## 3. High-level architecture

```
POST /query { message, job_id? }
    → Load conversation history (messages for job_id)
    → Build context: schema digest + Instacart rules + few-shot examples
    → LLM: produce SQL (single statement / CTEs) + optional draft insight
    → Validate SQL (read-only, allowed tables/views, timeouts)
    → Execute on DuckDB
    → Post-process: truncate wide rows for JSON; chart selection; finalize insight (LLM or template)
    → Persist assistant message (meta: sql, rows_preview, chart, error)
    → Return QueryTurnResponse
```

**Single orchestration module** (e.g. `app/services/bi_nl_engine.py` or `app/services/query_orchestrator.py`) keeps routers thin.

---

## 4. Schema & domain context for the LLM

**Deliverable:** one **prompt bundle** (versioned string or file) that includes:

1. **Table list** — DuckDB view names: `orders`, `products`, `aisles`, `departments`, `order_products_prior`, `order_products_train` (exact names from `instacart_dataset`).
2. **Join paths** — e.g. line items → `orders` on `order_id`; `products` on `product_id`; `aisles` / `departments` on ids.
3. **`eval_set`** — `orders.eval_set`: `prior` / `train` / `test`; default BI stance (e.g. union both product-order tables with a label, or restrict—**document one default**).
4. **NULL handling** — `days_since_prior_order` NULL on first orders; don’t average without `WHERE ... IS NOT NULL` when appropriate.
5. **Scale** — prefer aggregates + `LIMIT`; avoid `SELECT *` on 32M-row views without filters.

**Optional:** auto-refresh schema text from `information_schema` + append static rules (keeps columns accurate).

---

## 5. SQL generation

- **Model:** OpenAI / Anthropic / other via `app/clients/` (new module).
- **Output contract:** JSON or fenced SQL only—parse strictly; reject multiple statements unless CTE pipeline is one batch.
- **Temperature:** low for SQL stability.
- **Few-shot examples:** 3–5 examples including **≥1 three-table join** (e.g. line items + products + departments).

---

## 6. Validation & execution

**Reuse / extend** `validate_safe_select` in `bi_service.py`:

- Allow only **`SELECT` / `WITH` / `EXPLAIN`** (already).
- **Allowlist** identifiers: SQL may only reference approved view names (regex or sqlparse—start with substring checks + blocklist).
- **Limits:** server-side `statement_timeout` or DuckDB `SET` pragma; max **rows** returned to client (e.g. 5k) with `LIMIT` injection or post-fetch trim.
- **Retries:** on execution error, one or two **repair** prompts with DuckDB error text (stretch).

---

## 7. Polished response shape

Align with **`QueryTurnResponse`** in `app/models/pydantic/conversation.py`:

| Field | Purpose |
|-------|---------|
| `sql` | Final SQL executed (transparency, debugging). |
| `columns` | `{ name, type }[]` from DuckDB. |
| `rows` | 2D array; cap length for payload size. |
| `chart` | e.g. `{ "type": "bar" \| "line" \| "pie", "xKey", "yKey", ... }` — **Phase 1:** heuristic from column types + row count. |
| `insight` | Short bullet or paragraph—**Phase 1:** second LLM call on question + small result sample; or template if LLM disabled. |
| `error` | User-safe message if failed. |

---

## 8. Conversation memory & follow-ups

- Load **N** recent messages for `job_id` (roles + content + optional `meta.sql`).
- Prompt: “Previous question was …; user now says …” for refinements (“only organic”, “by department”).
- Store on assistant **`meta`**: `{ "sql", "row_count", "chart", "error" }` for replay and analytics.

---

## 9. Phases (recommended order)

| Phase | Scope | Outcome |
|-------|--------|---------|
| **P0** | Env vars (`OPENAI_API_KEY` / `ANTHROPIC_API_KEY`), client wrapper, orchestrator stub | One end-to-end path: NL → SQL → execute → table only |
| **P1** | Allowlist + row cap + schema prompt file | Safe, repeatable queries on Instacart |
| **P2** | Chart heuristics + insight LLM | “Polished” UX |
| **P3** | Error recovery retries + follow-up tuning | Stretch |
| **P4** | Materialized views / caching for hot paths | Scale stretch |

---

## 10. Configuration

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | LLM (choose one provider first). |
| `BI_NL_MODEL` | Model id (e.g. `gpt-4o-mini`). |
| `BI_NL_MAX_ROWS` | Cap rows returned to client. |
| `BI_SQL_STATEMENT_TIMEOUT_MS` | Optional DuckDB timeout. |

Document in `.env.example` (no secrets committed).

---

## 11. Testing strategy

- **Unit:** SQL validator allowlist; chart picker from fake columns/rows.
- **Integration:** mock LLM returning fixed SQL; assert DuckDB returns expected shape on tiny fixture DB or `:memory:` with minimal tables.
- **Manual:** sample questions from problem statement (3-table join, reorder rate, `eval_set`).

---

## 12. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Hallucinated tables/columns | Strict allowlist + schema in prompt |
| Huge scans / OOM | Timeouts, `LIMIT`, push aggregates in prompt |
| Prompt injection in `message` | System prompt boundaries; no string concat into unchecked SQL |
| Cost / latency | Smaller model for SQL; cache schema digest |

---

## 13. Definition of done (MVP)

- [ ] User can **`POST /query`** with a natural language question and existing **`job_id`**.
- [ ] Response includes **non-empty** `sql`, `columns`, `rows` for valid questions against Instacart views.
- [ ] Invalid or dangerous SQL never executes (validation catches).
- [ ] Assistant turn persisted with **SQL** (and error) in **`messages.meta`**.
- [ ] **`insight`** + **`chart`** populated at least in simple cases (P2 acceptable if P0–P1 ship table-only first—adjust milestones per sprint).

---

## 14. Out of scope for this plan

- In-app CSV parsing in the spreadsheet iframe (see product doc: Sheets URL / viewer).
- Authentication / multi-tenant **`user_id`** (v1 single user).
- Replacing DuckDB with another warehouse.

---

*Last updated: planning doc for Cissy backend NL→SQL BI.*

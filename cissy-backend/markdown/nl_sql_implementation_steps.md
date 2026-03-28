# NL→SQL implementation — what we built (plain-English summary)

This matches the code added for **`POST /api/v1/query`**. For the full roadmap, see [`conversational_bi_nl_sql_plan.md`](./conversational_bi_nl_sql_plan.md).

---

### Step 1 — Config and dependencies (**lame term:** “keys and knobs”)

- **What:** Environment variables for OpenAI (`OPENAI_API_KEY`, optional `BI_NL_MODEL`, `BI_NL_MAX_ROWS`) and the `openai` Python package.
- **Why:** The server needs an API key to call the model; max rows stops huge JSON responses.
- **Where:** `app/config.py`, `requirements.txt`, `.env.example`.

---

### Step 2 — Prompt cheat sheet (**lame term:** “rules of the road for the AI”)

- **What:** `INSTACART_RULES` + `format_schema_markdown()` — explains tables, joins, `eval_set`, NULLs, and that SQL must be safe/read-only-ish.
- **Why:** The model only answers well if it knows how Instacart is shaped and what to avoid.
- **Where:** `app/services/bi_nl_prompts.py`.

---

### Step 3 — Safer SQL (**lame term:** “only our grocery tables, not chat tables”)

- **What:** After the usual read-only checks, SQL may only reference **Instacart view names** (`orders`, `products`, …). `SELECT 1` with no `FROM` is still OK. **`fetch_instacart_schema`** hides `conversations` / `messages` from the prompt so the bot doesn’t query chat metadata by mistake.
- **Why:** Stops silly or dangerous table use in generated SQL.
- **Where:** `app/services/bi_service.py` (`extract_table_names_from_sql`, `validate_instacart_tables_only`, `execute_safe_select_limited`, `fetch_instacart_schema`).

---

### Step 4 — OpenAI calls (**lame term:** “ask GPT for SQL, then ask again for a short story”)

- **What:** One JSON response with **`sql`** + **`reasoning`**, then a second call that turns question + sample rows into a short **`insight`**.
- **Why:** First call does the heavy lifting; second call makes the answer readable for humans.
- **Where:** `app/services/bi_nl_openai.py`.

---

### Step 5 — Glue + chart guess (**lame term:** “put it together and guess bar vs line”)

- **What:** **`run_bi_nl_turn`** loads recent chat text, builds schema markdown, runs SQL generation → validates → runs DuckDB → trims rows → **`suggest_chart`** (simple heuristics) → insight.
- **Why:** One function the HTTP route can call.
- **Where:** `app/services/bi_nl_orchestrator.py`, `app/services/chart_heuristics.py`.

---

### Step 6 — Wire **`POST /query`** (**lame term:** “hook the pipe to the faucet”)

- **What:** Save user message → run orchestrator → save assistant message (with `sql`, `error`, `chart`, `row_count` in **`meta`**) → return **`QueryTurnResponse`**.
- **Why:** Frontend gets one JSON with **sql, columns, rows, chart, insight, error**.
- **Where:** `app/routers/query.py`.

---

### If no API key

- The server does **not** crash. It returns a clear **`insight`** telling you to set **`OPENAI_API_KEY`**. Tests force an empty key so they never hit the real API (`tests/conftest.py`).

---

### What you should do locally

1. Copy `.env.example` → `.env` and set **`OPENAI_API_KEY`**.
2. Ensure Instacart CSVs are under **`data/csv/`** so DuckDB views exist.
3. Call **`POST /api/v1/query`** with `{ "message": "…" }` and optional **`job_id`**.

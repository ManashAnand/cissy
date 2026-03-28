# Cissy Backend

FastAPI service that powers **conversational BI**: natural-language questions → **SQL** (via OpenAI) → **DuckDB** execution → chart hints, insights, and persisted chat threads keyed by **`job_id`**.

- **Stack:** Python, FastAPI, DuckDB, OpenAI API  
- **Analytics data:** Instacart-style CSVs exposed as DuckDB views (see `data/README.md`)  
- **App data:** Conversations and messages live in the same DuckDB file as app tables (`conversations`, `messages`)

---

## Requirements

- **Python 3.11+** (recommended; matches typical CI/local setups)
- Optional: [Kaggle API](https://www.kaggle.com/docs/api) credentials if you use the Instacart download script

---

## Quick start

```bash
cd cissy-backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a **`.env`** file in the project root (same folder as this README). The app loads it automatically via `pydantic-settings`. At minimum, set **`OPENAI_API_KEY`** for NL→SQL on `POST /api/v1/query`.

```bash
cp .env.example .env
# Edit .env — see table below
```

Run the API:

```bash
uvicorn app.server:app --reload
```

- **Local base URL:** `http://127.0.0.1:8000`  
- **API prefix:** `/api/v1` (unless overridden)  
- **OpenAPI docs:** `http://127.0.0.1:8000/docs`  
- **Health:** `GET /api/v1/health`

Place Instacart CSVs under `data/csv/` (see `data/README.md`) or override paths with env vars below.

---

## Environment variables

Configuration is defined in `app/config.py`. Values can be set in **`.env`** or in the shell. Names follow **Pydantic Settings** conventions (typically **UPPER_SNAKE_CASE** matching each field).

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| **`OPENAI_API_KEY`** | **Yes** for NL→SQL | _empty_ | OpenAI API key. If unset, `POST /api/v1/query` still works but returns a message asking you to configure the key (no generated SQL). |
| **`DUCKDB_PATH`** | No | `./data/instacart.duckdb` | Path to the DuckDB file (analytics + app tables). Parent directory is created on startup. Use `:memory:` for ephemeral DB (e.g. some tests). |
| **`DATA_CSV_DIR`** | No | `./data/csv` | Directory where Instacart CSVs live; created on startup. Views are registered per file that exists. |
| **`BI_NL_MODEL`** | No | `gpt-4o-mini` | OpenAI model id for NL→SQL and insight generation. |
| **`BI_NL_MAX_ROWS`** | No | `500` | Max rows returned from a generated `SELECT` (safety cap). |
| **`API_V1_PREFIX`** | No | `/api/v1` | URL prefix for all routes in `app/routers`. |
| **`ROOT_PATH`** | No | _empty_ | ASGI `root_path` when the app sits behind a reverse proxy that strips a prefix; leave empty for local dev. |
| **`APP_NAME`** | No | `Cissy Backend` | FastAPI title / metadata. |
| **`DEBUG`** | No | `false` | Reserved / general debug flag (boolean). |

### Example `.env`

```env
# Required for conversational NL → SQL
OPENAI_API_KEY=sk-...

# Optional — defaults are fine for local dev
DUCKDB_PATH=./data/instacart.duckdb
DATA_CSV_DIR=./data/csv
BI_NL_MODEL=gpt-4o-mini
BI_NL_MAX_ROWS=500
```

Do **not** commit real API keys. Keep `.env` out of version control (it should be gitignored).

---

## API overview

All JSON routes are under **`API_V1_PREFIX`** (default **`/api/v1`**).

| Area | Examples |
|------|----------|
| Health | `GET /health` |
| Dashboard | `GET /dashboard` |
| Chats | `GET/POST /conversations`, `GET /conversations/{job_id}/messages`, `DELETE /conversations/{job_id}` |
| NL query | `POST /query` — body: `message`, optional `job_id` / `conversationId` |
| BI (warehouse) | `GET /bi/ready`, `GET /bi/schema`, `POST /bi/query`, previews under `/bi/...` |

More detail: `markdown/conversation_api_structure.md`, `markdown/dashboard-apis.md`, `markdown/chart-types.md`.

---

## Tests

```bash
pytest tests/ -q
```

Tests often force **`DUCKDB_PATH=:memory:`** and a temp CSV dir (see `tests/conftest.py`) so they do not touch your real `data/` files.

---

## Project layout (short)

| Path | Role |
|------|------|
| `app/server.py` | FastAPI app + lifespan (DuckDB, schema, Instacart views) |
| `app/config.py` | Settings / env |
| `app/routers/` | HTTP routes |
| `app/services/` | BI, NL→SQL orchestration, conversations, chart heuristics |
| `data/` | Local DuckDB file and CSVs (see `data/README.md`) |
| `markdown/` | Design and API notes for humans / frontend |
| `scripts/` | e.g. Instacart download helper |

---

## License

Add a `LICENSE` file if you publish this repository.

---

## Notes for recruiters

### Cost profile

NL→SQL and insight generation use **`gpt-4o-mini`** by default (`BI_NL_MODEL`), which keeps **API cost low** compared with full-size reasoning models. Each conversational turn uses **two** focused model calls (SQL, then summary—not one giant prompt with the whole dataset).

### Security and data handling (OpenAI)

- **Raw CSVs / warehouse files are not uploaded to OpenAI.** Data stays on disk and in **DuckDB** under your control.
- **SQL generation** only receives **schema metadata** (table and column names/types from DuckDB introspection), plus the user question and a short chat snippet—so the model can write valid `SELECT`s without seeing bulk tabular exports.
- **Insight generation** receives a **small, capped sample of query result rows** (a handful of rows by design) so the model can write a plain-English summary—**not** full extracts of your CSVs or the entire result set (execution is still capped by `BI_NL_MAX_ROWS` locally).

This split limits exposure to **metadata + minimal aggregates** needed for NL→SQL and short summaries, rather than shipping the dataset to a third party.

### SQL execution guardrails (read-only, server-side)

Generated and ad-hoc analytics SQL is **not** run blindly. Before DuckDB executes anything on the NL→SQL path, the backend validates it in `app/services/bi_service.py`:

- **Statement type** — Only a single **`SELECT`**, **`WITH …`**, or **`EXPLAIN`** (for explain-on-select) is allowed. Anything else is rejected.
- **No write or DDL** — Queries containing keywords such as **`INSERT`**, **`UPDATE`**, **`DELETE`**, **`DROP`**, **`CREATE`**, **`ALTER`**, **`TRUNCATE`**, and other dangerous tokens are **blocked** so users cannot modify or destroy data through the query API.
- **No multi-statements** — Semicolon-chained batches are rejected to reduce injection-style abuse.
- **Table allowlist** — Queries run through the shared safe executor ( **`POST /query`** NL→SQL path and **`POST /bi/query`** ) may only reference **approved Instacart view names**, not arbitrary tables.

Together, these guardrails keep the analytics surface **read-only** at the application layer: natural language still becomes SQL, but **mutating** or **schema-changing** operations do not run.

### “Subagent”-style orchestration

The backend **does not** send one monolithic prompt for everything. It uses a **decomposed pipeline** (similar in spirit to **specialist sub-agents** or tool routing in agent systems):

1. **SQL stage** — one LLM call constrained to JSON output (`generate_sql`): question + schema + history → DuckDB `SELECT`.
2. **Local execution** — SQL runs on the server; results stay in-process.
3. **Insight stage** — a **second** LLM call (`generate_insight`) only sees the question, SQL, column names, and a **small row sample** → short narrative.
4. **Chart stage** — **deterministic** Python heuristics (`chart_heuristics`) choose chart type from column shapes—**no** extra LLM call.

So responsibilities are **separated**: schema-aware SQL author, executor, summarizer, and rule-based visualization hint—mirroring how multi-agent setups delegate work without one model holding all context at once.

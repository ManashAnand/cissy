# Cissy — Conversational BI (full stack)

End-to-end **conversational analytics**: users ask questions in plain English; a **FastAPI** service turns them into **SQL**, runs them on **DuckDB** (Instacart-style data), returns tables, **chart hints**, and insights; a **Next.js** app provides the dashboard, BI workspace (spreadsheet + chat), **Recharts** visualizations, and **persisted threads** keyed by `job_id`.

| Layer | Stack | Repository / folder |
|-------|--------|---------------------|
| **Backend** | Python, FastAPI, DuckDB, OpenAI API | Typically **`cissy-backend/`** (clone or place next to this repo) |
| **Frontend** | Next.js 14, React, Redux, TanStack Query, Recharts | **`cissy-frontend/`** (this repository) |

---

## Architecture (at a glance)

1. **Frontend** (`npm run dev`, port **3000** by default) calls **`/api/v1/...`**.  
2. Recommended: **same-origin proxy** — `NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1` and Next **rewrites** `/api/v1/*` → **`BACKEND_URL`** (avoids browser CORS to port 8000).  
3. **Backend** (`uvicorn`, port **8000** by default) serves **`/api/v1`**: `POST /query`, conversations CRUD, health, dashboard, etc.

---

## Full stack — run locally

Do these in **two terminals**: backend first, then frontend.

### 1. Backend (FastAPI)

```bash
cd cissy-backend   # or path to your backend clone
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — at minimum set OPENAI_API_KEY (see table below)
uvicorn app.server:app --reload
```

- **API base:** `http://127.0.0.1:8000`  
- **JSON routes:** under **`/api/v1`** (unless you change `API_V1_PREFIX`)  
- **Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)  
- **Health:** `GET /api/v1/health`  

Place Instacart CSVs under **`data/csv/`** (see `data/README.md` in the backend repo) or override paths with env vars.

### 2. Frontend (Next.js — this repo)

```bash
cd cissy-frontend   # this repository
npm install
cp .env.example .env.local
```

Set **`BACKEND_URL=http://localhost:8000`** (or your backend URL) so Next can proxy. Set **`NEXT_PUBLIC_API_URL`** as below.

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**.

---

# Backend (FastAPI)

FastAPI service: NL → **SQL** (OpenAI) → **DuckDB** → chart hints, insights, persisted chats in **`conversations`** / **`messages`**.

### Requirements

- **Python 3.11+** (recommended)  
- Optional: [Kaggle API](https://www.kaggle.com/docs/api) if you use the Instacart download script  

### Backend environment variables

Configuration lives in **`app/config.py`**; load values via **`.env`** in the backend project root (Pydantic Settings, **UPPER_SNAKE_CASE**).

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| **`OPENAI_API_KEY`** | **Yes** for real NL→SQL | _empty_ | If unset, `POST /api/v1/query` may still respond but without generated SQL. |
| **`DUCKDB_PATH`** | No | `./data/instacart.duckdb` | DuckDB file (analytics + app tables). Parent dir is created on startup. Use `:memory:` for ephemeral DB in tests. |
| **`DATA_CSV_DIR`** | No | `./data/csv` | Instacart CSV directory; views registered per file present. |
| **`BI_NL_MODEL`** | No | `gpt-4o-mini` | OpenAI model for NL→SQL and insights. |
| **`BI_NL_MAX_ROWS`** | No | `500` | Max rows from a generated `SELECT`. |
| **`API_V1_PREFIX`** | No | `/api/v1` | URL prefix for routers. |
| **`ROOT_PATH`** | No | _empty_ | ASGI `root_path` behind a path-stripping reverse proxy. |
| **`APP_NAME`** | No | `Cissy Backend` | FastAPI title. |
| **`DEBUG`** | No | `false` | Debug flag. |

**Example `.env` (backend):**

```env
OPENAI_API_KEY=sk-...
DUCKDB_PATH=./data/instacart.duckdb
DATA_CSV_DIR=./data/csv
BI_NL_MODEL=gpt-4o-mini
BI_NL_MAX_ROWS=500
```

Do **not** commit secrets. Keep **`.env`** gitignored.

### Backend API overview

All JSON routes sit under **`API_V1_PREFIX`** (default **`/api/v1`**).

| Area | Examples |
|------|----------|
| Health | `GET /health` |
| Dashboard | `GET /dashboard` |
| Chats | `GET/POST /conversations`, `GET /conversations/{job_id}/messages`, `DELETE /conversations/{job_id}` |
| NL query | `POST /query` — body: `message`, optional `job_id` / `conversationId` |
| BI (warehouse) | `GET /bi/ready`, `GET /bi/schema`, `POST /bi/query`, etc. |

More detail in the backend repo: `markdown/conversation_api_structure.md`, `markdown/dashboard-apis.md`, `markdown/chart-types.md`.

### Backend tests

```bash
cd cissy-backend
pytest tests/ -q
```

Tests often use **`DUCKDB_PATH=:memory:`** and temp CSV dirs (see `tests/conftest.py`) so your real `data/` is untouched.

### Backend layout (short)

| Path | Role |
|------|------|
| `app/server.py` | FastAPI app + lifespan (DuckDB, schema, views) |
| `app/config.py` | Settings / env |
| `app/routers/` | HTTP routes |
| `app/services/` | BI, NL→SQL, conversations, chart heuristics |
| `data/` | DuckDB file + CSVs |
| `markdown/` | API / design notes for humans & frontend |
| `scripts/` | e.g. Instacart download helpers |

---

# Frontend (Next.js — this repository)

### Prerequisites

| Requirement | Notes |
|---------------|--------|
| **Node.js** | 18.x or 20.x (LTS) |
| **npm** | Bundled with Node |

### Frontend environment variables

Create **`.env.local`** in **this** project root (Next loads it automatically):

```bash
cp .env.example .env.local
```

#### Required (working UI + API)

| Variable | Description |
|----------|-------------|
| **`NEXT_PUBLIC_API_URL`** | Base URL the **browser** uses. Must include **`/api/v1`** (e.g. `http://localhost:3000/api/v1`). |
| **`BACKEND_URL`** | Target for Next **rewrites** (`next.config.mjs`): FastAPI origin **without** trailing slash, e.g. `http://localhost:8000`. Not exposed to the client bundle. |

**Recommended (avoids CORS):**

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Alternative** (browser talks directly to FastAPI — enable **CORS** on the backend for `http://localhost:3000`):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Optional (frontend)

| Variable | Description |
|----------|-------------|
| **`NEXT_PUBLIC_BI_SPREADSHEET_URL`** | Default Google Sheet for BI workspace when not using `?excel=`. |
| **`NEXT_PUBLIC_BI_SPREADSHEET_TABS`** | JSON `[{ "name", "url" }, ...]` — overrides `src/config/bi-spreadsheet-tabs.ts`. |

Restart **`next dev`** after changing **`NEXT_PUBLIC_*`** or **`BACKEND_URL`**.

### Frontend scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Production server (after `build`) |
| `npm run lint` | ESLint |

### Frontend production build

```bash
npm run build
npm run start
```

Set the same env vars on the host; **`BACKEND_URL`** must point at your deployed API for rewrites.

### Frontend layout (short)

| Path | Role |
|------|------|
| `src/app/` | App Router: `/`, `/bi`, `/bi/[jobId]` |
| `src/components/` | Chat, BI workspace, dashboard, layout |
| `src/redux/` | Conversation + query UI state |
| `src/services/api/` | HTTP client (`/query`, `/conversations`, …) |
| `src/lib/` | Helpers, message mapping |
| `docs/` | Extra UI / product notes |

### Dashboard

The home page greets the analyst, shows summary metrics (projects, documents, timing, pending work), and links to **New chat**. **Your Projects** lists BI conversations with search, status filter, and grid or list layout; each card supports rename, launch to the BI workspace, details, and delete.

![Dashboard — overview: greeting, metrics, and Your Projects (partial)](docs/images/dashboard/home-overview.png)

![Your Projects — grid view with search, filters, and project cards](docs/images/dashboard/projects-grid.png)

![Your Projects — list view with actions (Launch, Info, Delete)](docs/images/dashboard/projects-list.png)

### Chatbot (Financial Analyst)

On **`/bi/[jobId]`**, the **Financial Analyst** chat sends natural-language questions to **`POST /api/v1/query`**. Replies can include **insight text**, a **SQL** block (with copy), and **charts** driven by the backend `chart` object (bar, line, pie, scatter). The spreadsheet pane can show an embedded Google Sheet or data preview; the chat can stay **floating** or **docked** beside the sheet. Conversation history is loaded from **`GET /api/v1/conversations/{job_id}/messages`** when you reopen a thread.

#### Why floating chat and capped query previews

- **Floating (or docked) chat, sheet stays visible** — The point is to **avoid tab-hopping**. You keep the embedded sheet (or data context) in view while you ask questions and read answers. That way you can treat the assistant’s **SQL**, **chart**, and **result preview** as immediate **proof of extraction** against what you see in the workspace, without leaving the BI surface or juggling another browser tab.
- **Capped table & chart in the chat** — We still show a **real** slice of what DuckDB returned—enough to **validate** the query and build trust—but not an unbounded dump. The UI renders only the **first 500 rows** of a result table (with an explicit message when more rows exist); charts use the same capped / summarized semantics so visuals stay meaningful. That keeps the chat responsive and readable when underlying tables can hold **millions** of rows, while the backend’s NL→SQL path also applies its own **row cap** for safety.

![BI workspace — floating Financial Analyst over the sheet (question, answer, SQL)](docs/images/chatbot/workspace-floating.png)

![Docked chat beside the aisles spreadsheet — NL→SQL, SQL block, and reply](docs/images/chatbot/docked-spreadsheet-chat.png)

![Docked layout — large table preview (e.g. order lines) with chart + SQL alongside](docs/images/chatbot/docked-large-sheet-chart.png)

![Financial Analyst — insight text, SQL snippet, and chart preview](docs/images/chatbot/analyst-sql-and-chart.png)

![Pie / donut chart — slice tooltip and scrollable legend (values and %)](docs/images/chatbot/donut-tooltip-legend.png)

### Light and dark mode

The app shell supports **light** and **dark** themes. Use the **sun / moon** control in the top navbar to switch; the choice applies to the dashboard, BI workspace, and Financial Analyst chat. Earlier screenshots on this page mostly show **dark** mode; below is the same experiences in **light** mode (white surfaces, purple accents).

![Light theme — home dashboard: greeting, KPI cards, Your Projects header](docs/images/theme/light-dashboard-home.png)

![Light theme — BI workspace: embedded sheet preview, docked chat with SQL and donut chart](docs/images/theme/light-bi-workspace-docked.png)

### Other (app shell)

Beyond the main content areas above, the **navbar** includes:

- **Ask data** — quick link back toward the main dashboard / entry flow  
- **Zoom** — page chrome zoom around **100%** (− / +) for readability  
- **Refresh** — reload the current view  
- **Theme toggle** — light / dark (see previous section)  
- **Profile** — account placeholder  

More detail on layout and styling tokens lives in **`docs/styling-engine.md`**.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| **Frontend gets HTML or 404 from API** | `NEXT_PUBLIC_API_URL` ends with **`/api/v1`**; backend is running; **`BACKEND_URL`** matches backend origin if you use the proxy. |
| **CORS in the browser** | Prefer **`NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1`** + **`BACKEND_URL`**, or add CORS on FastAPI for the frontend origin. |
| **Env ignored** | Restart Next after editing **`.env.local`**. Restart uvicorn after editing backend **`.env`**. |
| **No SQL from `/query`** | Backend **`OPENAI_API_KEY`** set and valid. |

---

## Future scopes

1. **Authentication and per-user jobs** — Introduce **sign-in** and associate every **`job_id`** (conversation / BI thread) with a **`user_id`**, so each analyst only accesses their own history and data—proper **multi-tenant isolation** instead of a shared anonymous workspace.
2. **Drop-in CSV → full pipeline** — The product already surfaces **Add files** in places, but ingestion is **not fully wired**. The aim is for a user to **drop a CSV** (or pick a file) and have it flow through **load → DuckDB (or equivalent) → NL→SQL → charts** without manual backend steps.
3. **Chart generation via GPT (with guardrails)** — Today, chart **type** hints come largely from **deterministic rules** on columns and row shapes. A future step is to let the **GPT API** propose charts from the **actual query result** (not only relational metadata), while keeping **strict server-side guards**—caps, validation, and policy checks—so visuals stay safe and trustworthy.
4. **Report issue → developer workflow** — Ship the **Report issue** entry point end-to-end so feedback becomes **actionable tickets** for developers (e.g. GitHub Issues, Jira, or a shared inbox) instead of an unhandled control.

---

## License

- **Frontend** package: `"private": true` — add a **`LICENSE`** if you publish.  
- **Backend:** add a **`LICENSE`** in that repository if you publish.



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

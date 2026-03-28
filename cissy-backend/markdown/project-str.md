# Hencorp Backend — Project Structure

This repository is a **Python [FastAPI](https://fastapi.tiangolo.com/)** service (“Hencorp Backend”). The API is mounted under `root_path=/api/v1` (see `app/server.py`). Business logic lives under `app/services/`; HTTP routes under `app/routers/`; persistence and request/response shapes under `app/models/`.

---

## Repository layout (top level)

| Path | Purpose |
|------|---------|
| `app/` | Application package: server, routes, services, models, middleware, external clients |
| `migrations/` | SQL migration scripts (Supabase / Postgres schema changes) |
| `scripts/` | One-off utilities (templates, DB tools, local testing helpers) |
| `tests/` | Project-level tests (additional tests live under `app/tests/`) |
| `markdown/` | Internal design and flow notes (e.g. extraction flows, org permissions) |
| `templates/` | Root-level YAML template definitions and `template_registry.yaml` |
| `requirements.txt` | Python dependencies |
| `Dockerfile` | Container image for deployment |
| `run.sh` | Local run helper |
| `alembic.ini.example` | Example Alembic config (if used for migrations) |
| `.env` | Environment variables (not committed; configure locally) |

Generated or local artifacts (e.g. `venv/`, `__pycache__/`, debug `.txt` logs) are not part of the intended source layout.

---

## Application entrypoint

- **`app/server.py`** — Instantiates `FastAPI`, wires CORS, Sentry, middleware, lifespan hooks (chat buffer, request queue, rate limiter, LLM connection pools), and includes the aggregated API router from `app/routers/__init__.py`.

---

## `app/routers/` — HTTP API surface

Each file typically defines a `FastAPI` `APIRouter` for one feature area. Routers are composed in **`app/routers/__init__.py`** into a single `router` mounted by the app.

**Currently registered routers** (from `__init__.py`): extraction (`extract`, `extract_v2`), `custom_ocr`, `ocr_standard`, `jobs`, `admin`, `chat`, `quick_actions`, `websocket`, `research`, `detailed_document`, `api_keys`, `public_api`, `performance`, `unit_conversion`, `templates`, `company_verification`, `financial_agent`, `tickets`, `resource_status`, `report_generation`, `file_management`, `excel_agent_proxy`, `shareable_links`, `public_shareable_links`, `quickbooks`.

**Additional router module** (present in the package but not included in `__init__.py`): `agent_chat.py` — may be experimental or wired elsewhere; check before relying on it in production.

Static assets sometimes appear next to routers for legacy or embedding (e.g. `comprehensive-report.html`).

---

## `app/middleware/` — Cross-cutting concerns

- **Auth** — `auth.py`, `websocket_auth.py`
- **Operational** — `rate_limiting.py`, `request_queue.py`, `resource_manager.py`

---

## `app/clients/` — External service adapters

Thin wrappers and connection handling for third-party APIs and infrastructure:

- **`anthropic/`** — Claude / Anthropic client and connection pool
- **`openai/`** — OpenAI connection pool
- **`supabase/`** — Supabase client, SQLAlchemy, sessions, cache helpers
- **`s3/`** — S3 file helpers
- **`gcp/`** — Google Cloud–related init/helpers

---

## `app/auth/` — Authentication helpers

Shared utilities used by routers/middleware (e.g. `auth_utils.py`).

---

## `app/models/` — Data shapes

- **`sql_models/`** — SQLAlchemy (or similar) models aligned with the database (users, jobs, templates, financial statement tables, shareable links, chats, etc.)
- **`pydantic_models/`** — Pydantic models for validation and API payloads (financial statements, periods, tickets, etc.)
- **`api/`** — API-oriented models (chat, research, extraction, API keys)
- **`chat/`** — Chat message models
- **`dynamic_models.py`**, **`ofac_models.py`** — Specialized model groupings

---

## `app/services/` — Business logic (largest area)

Organized by domain. Routers call into these modules; they orchestrate clients, DB, and LLMs.

| Area | Role |
|------|------|
| **`extraction/`** | Legacy / v1 financial extraction (validators, sheet updaters, templating, patch extract, period extraction) |
| **`extraction_v2/`** | Newer extraction pipeline: balance sheet / income / “other” sheet extractors, common OCR/period/unit logic, template YAML loading, Excel updaters, patch extraction |
| **`extraction_v2/templates/templates_yaml/`** | YAML definitions used by v2 templates (e.g. US GAAP, CAM global, BB Energy) |
| **`templates/`** | Shared template loading (`template_loader.py`) at the services layer |
| **`chat/`** | Agents: financial agent, contract QA, sheet QA, context managers, tools, chart generation |
| **`report_generation/`** | Report building: sections, HTML, charts, currency, GSheet context, storage, verification |
| **`document_analysis/`** | Detailed documents, LLM HTML, web search, currency extraction, dynamic reports |
| **`research/`** | Deep research orchestration |
| **`custom_ocr/`** | Custom vs standard OCR extractors |
| **`common/`** | Shared utilities: OCR, S3/GCP, file upload, WebSockets, DB helpers, document classifier, etc. |
| **`shareable_links/`** | Shareable link validation and password handling |
| **`unit_conversion.py`**, **`unit_conversion_service.py`**, **`simple_unit_conversion_service.py`** | Unit conversion |
| **`report_editor.py`**, **`agent_tool_registry.py`** | Editing and tool registration |

---

## `app/templates/` — Bundled YAML templates

YAML templates and **`template_registry.yaml`** shipped with the app (IFRS, US GAAP, BB Energy, Atlas, etc.). This overlaps conceptually with root `templates/` and `app/services/extraction_v2/templates/templates_yaml/` — different stages or deployment copies may use different paths.

---

## `app/` — Other notable files

- **`config.py`** — Central configuration (env-based)
- **`constants.py`** — Shared constants
- **`template_access.py`** — Template access rules/helpers
- **`temp/`** — Runtime temp files (e.g. uploads); typically not source-controlled meaningfully

---

## `migrations/`

Versioned **SQL** files applied against the database (tables for jobs, Excel agent, shareable links/folders, templates, costs, etc.). Apply according to your deployment process (manual, CI, or migration runner).

---

## `scripts/`

Operational scripts: template population, password reset tooling, performance tests, template analysis, secrets loading, etc.

---

## Tests

- **`tests/`** — Top-level pytest modules (e.g. `test_detailed_document.py`, `tests/services/...`)
- **`app/tests/`** — Tests colocated with the app (e.g. chat history)

---

## `markdown/`

Internal documentation (flows, org/job plans, permissions). Complements this file, which focuses on **folder layout** only.

---

## Mental model

```
HTTP request
    → FastAPI (app/server.py)
        → Middleware (auth, rate limits, queues, …)
            → Router (app/routers/…)
                → Service (app/services/…)
                    → Clients (app/clients/…) / DB models (app/models/sql_models/…)
```

For a full list of endpoints, inspect each router file or use FastAPI’s OpenAPI docs when the server is running.

---

## Local data (Cissy backend)

DuckDB and raw CSVs are stored **inside `cissy-backend/data/`** (not beside `cissy-frontend`). Defaults: `data/instacart.duckdb`, `data/csv/` for imports. See `data/README.md`.

### `data/csv/` — Instacart CSV inventory

There are **6** CSV files. Row counts below are **data rows** (one header line per file excluded).

| File | Data rows |
|------|-----------|
| `aisles.csv` | 134 |
| `departments.csv` | 21 |
| `orders.csv` | 3,421,083 |
| `order_products__prior.csv` | 32,434,489 |
| `order_products__train.csv` | 1,384,617 |
| `products.csv` | 49,688 |
| **Total** | **37,290,032** |

---

## Monorepo folder layout (parent of this repo)

```
conversastional bi agents/
├── cissy-backend/     ← API + DuckDB + CSV layout (this repo)
└── cissy-frontend/
```
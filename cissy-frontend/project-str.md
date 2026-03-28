# Project structure

This document describes how the **credit-frontend-hencorp** codebase is organized. The app is a [Next.js 14](https://nextjs.org/) (App Router) frontend written in **TypeScript**, using **Supabase** for auth, **TanStack Query** and **Redux** for data/state, **Tailwind CSS** + **Radix UI** for UI, and **PostHog** for analytics.

---

## Repository root

| Path | Purpose |
|------|---------|
| `package.json` / `yarn.lock` | Dependencies and scripts (`dev`, `build`, `start`, `lint`). Package manager: **Yarn 4**. |
| `next.config.js` | Next.js configuration (bundling, env, etc.). |
| `tsconfig.json` | TypeScript config; path alias `@/*` → `./src/*`. |
| `tailwind.config.ts`, `postcss.config.js` | Styling pipeline. |
| `.env` | Environment variables (not committed with secrets in production—use your team’s secret management). |
| `.eslintrc.*`, `.prettierrc` (if present) | Lint and format. |
| `.husky/` | Git hooks (e.g. post-install). |
| `.github/workflows/` | CI/CD workflows. |
| `.cursor/rules/` | Cursor / AI editor rules for this repo. |
| `.vscode/` | Optional VS Code workspace settings. |
| `public/` | Static files served at `/` (favicons, logos, etc.). |
| `docs/` | Markdown documentation for features and internal flows. |
| `node_modules/` | Dependencies (generated). |
| `.next/` | Next.js build output (generated; not source of truth). |

---

## Source: `src/`

All application source lives under **`src/`**. Imports use the **`@/`** alias (maps to `src/`).

### App Router — `src/app/`

Next.js **App Router** defines routes, layouts, and API handlers.

| Area | Path | Role |
|------|------|------|
| Root layout | `layout.tsx` | Global HTML shell, metadata, `Providers`, PostHog, Toaster, global CSS. |
| Middleware integration | `../middleware.ts` (at `src/middleware.ts`) | Session refresh, public vs protected paths (see below). |

**Route groups and pages**

- **`src/app/(protected)/`** — Authenticated product UI. Layout checks Supabase user and redirects to sign-in if missing; wraps content with **Navbar** + main container.
  - `page.tsx` — Main dashboard/home under protection.
  - `admin/` — Admin dashboard and admin tickets.
  - `credit-analyst/` — Credit analyst flows (job detail, org by domain, SAT analytics).
  - `contract-analyst/` — Contract analyst job views.
  - `financial-modeler/` — Financial modeler flows.
  - `settings/` — User/settings UI.
  - `shareable-folders/`, `shareable-links/[linkId]/` — Sharing features.

- **`src/app/auth/`** — Sign-in, sign-up, reset password, OAuth **callback**, password **recover** routes (unauthenticated flows).

- **`src/app/public/`** — Public-facing routes (e.g. **`upload/[token]`** for token-based uploads).

- **`src/app/satcreds/[id]/`** — Public SAT credentials pages (middleware skips auth for `/satcreds/`).

- **`src/app/mastra/mastra-helper/`** — Mastra-related helper route(s).

**API routes — `src/app/api/`**

Server-side Route Handlers (Next.js `route.ts`) used as BFF/proxy or server logic:

- `admin/` — Files, download, organization users, tickets (+ `[id]`, stats overview).
- `org/` — Org files (`[id]`), jobs.
- `organization-users/`, `tickets/` — Additional API surfaces.

These typically bridge the browser to backend services while keeping secrets off the client where appropriate.

---

### Components — `src/components/`

| Folder | Role |
|--------|------|
| `ui/` | Reusable primitives: buttons, dialogs, **data-table**, **loaders**, PDF viewer wrappers, Sonner toaster, etc. (shadcn-style + project customizations). |
| `common/` | Shared pieces: **layout** (e.g. navbar), misc widgets, shared API helpers under `common/api`. |
| `Chat/` | Chat-related shared UI. |
| `modules/auth/` | Auth screens and **api** helpers (`signin`, `signout`, `reset-password`, …). |
| `modules/admin/` | Admin entry UI. |
| `modules/protected/` | Main product surface area: **dashboard** (upload, jobs, history, shareable links/folders, steps including categorize-pages), **agents** (credit, contract, excel chats and tooling), **admin** tickets, **settings**, **tickets**. Often colocated **`api/`** folders for client-side fetch helpers next to the feature. |
| `examples/` | Example or demo components. |
| `test/` | Test-only or dev components. |

**Convention:** Feature-heavy UI lives under `modules/protected/…` with optional neighboring `api/` directories for that feature’s HTTP calls.

---

### State and data — `src/lib/`, `src/redux/`, `src/services/`

| Path | Role |
|------|------|
| `lib/providers/` | React context providers (app shell, theme, TanStack Query, **PostHog**). |
| `lib/hooks/` | Shared hooks (user preferences, SAT extraction, RPC, file processor, admin check, etc.). |
| `lib/store/` | Client stores (e.g. Zustand-style **chat** / **excel-agent-chat** stores). |
| `lib/services/` | Client-side domain services (e.g. detailed document handling). |
| `lib/constants/` | App constants. |
| `lib/utils/` | Generic utilities (`cn`, helpers). |
| `lib/i18n/` | Internationalization scaffolding and **translations**. |
| `redux/` | **Redux Toolkit** slices under `redux/features/` (e.g. **chats**, **settings**). |
| `services/api/` | Shared API modules (e.g. shareable links, unit conversion) used across features. |

---

### Config, types, utils — `src/config/`, `src/types/`, `src/utils/`

| Path | Role |
|------|------|
| `config/site.ts` | Site metadata, URLs, links to auth pages (used in layouts and redirects). |
| `types/` | Shared TypeScript types (e.g. **Supabase**-related types). |
| `utils/supabase/` | **Supabase** browser client, server client, and **middleware** session helper used by `src/middleware.ts`. |

---

### Other `src/` paths

| Path | Role |
|------|------|
| `styles/globals.css` | Global CSS (Tailwind layers + app-wide styles). |
| `assets/` | Images and icons imported by components. |
| `pages/` | Legacy **Pages Router** leftovers (`_app.js`, `_document.js`, `test-chart.tsx`); primary routing is **`app/`**. |
| `test/` | Tests co-located under `src/test/` where present. |

---

## Cross-cutting behavior

### Authentication and protection

- **`src/middleware.ts`** — Refreshes Supabase session via `updateSession`, allows static assets and `/api/*`, skips heavy auth for `/auth/callback`, **`/satcreds/*`**, and passes through public marketing/static paths as configured.
- **`src/app/(protected)/layout.tsx`** — Server-side `getUser()`; redirects unauthenticated users to the sign-in URL from **`siteConfig`**.

### Analytics

- **PostHog** is wired through `PostHogProvider` and related config; feature-flag and event naming conventions are described in `.cursor/rules/posthog-integration.mdc`.

### Styling

- **Tailwind CSS** with **tailwindcss-animate** and **tailwind-merge**; **class-variance-authority** for component variants; **Radix UI** primitives under `components/ui`.

---

## Documentation in `docs/`

Additional markdown files (feature specs, session flows, admin migration notes, etc.) live beside this file. See individual `*.md` files in **`docs/`** for deep dives.

---

## Quick mental model

1. **`src/app/`** — URLs, layouts, and **`api`** route handlers.  
2. **`src/components/`** — UI building blocks (`ui`) and feature modules (`modules/...`).  
3. **`src/lib/` + `src/services/` + `src/redux/`** — Hooks, providers, stores, and API modules.  
4. **`src/utils/supabase/` + `src/middleware.ts`** — Auth session and Supabase integration.  
5. **`src/config/` + `src/types/`** — Central config and shared types.

This structure keeps **routing** in `app/`, **screens and widgets** in `components/`, and **cross-cutting logic** in `lib/`, `services/`, and `redux/`.

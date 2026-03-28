# Frontend structure (Cissy BI)

Mirrors **project-str.md** (Cissy-frontend pattern) with these differences:

- **No authentication** — no `middleware.ts` session refresh, no `(auth)/`, no `components/modules/auth/`, no Supabase.
- **Data layer** — `src/services/api/` and `src/utils/api/` call the **FastAPI** backend (DuckDB), not Supabase.
- **Route group** — `src/app/(app)/` holds the main shell (navbar + container); URLs are `/`, `/bi`, etc. (not `(protected)`).
- **Analytics** — PostHog omitted for the MVP (can add later).

## Layout

| Area | Path |
|------|------|
| App Router | `src/app/` — `layout.tsx`, `(app)/layout.tsx`, `(app)/page.tsx`, `(app)/bi/page.tsx` |
| UI primitives | `src/components/ui/` |
| Shared layout | `src/components/common/layout/` |
| BI feature | `src/components/modules/bi/` |
| Chat | `src/components/Chat/` |
| Providers | `src/lib/providers/` — Redux + TanStack Query + Toaster |
| Redux | `src/redux/` — e.g. `features/conversationSlice.ts` |
| API client | `src/services/api/client.ts` |
| Types | `src/types/api.ts` |
| Config | `src/config/site.ts` |
| Styles | `src/styles/globals.css` |

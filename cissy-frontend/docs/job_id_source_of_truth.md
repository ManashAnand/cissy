# `job_id` as the single source of truth

This document explains how **`job_id`** (the identifier of a row in the **`jobs`** table) is treated as the canonical ID for **processing, chat, reports, and integrations** across this repo, and how it relates to other IDs you will see (especially **`user_files.id`**).

---

## What `job_id` refers to

- In **PostgREST / Supabase** responses, **`job_id`** is the column on **`user_files`** that **foreign-keys to `jobs.id`** (see generated types in `src/types/supabase.ts`).
- In **TypeScript/React**, the same value is usually named **`jobId`** (camelCase): props, Zustand store, and hook arguments.

The **job** row holds domain fields such as status, company name, and job type. Any feature that needs to talk to the backend about **that analysis pipeline** should use **`job_id` / `jobId`**, not the file-row id.

---

## What is *not* `job_id` (common confusion)

| Identifier | What it is | Typical use in the app |
|------------|------------|-------------------------|
| **`user_files.id`** | Primary key of the **`user_files`** row | **URL segment `[id]`** for analyst routes (e.g. `/Cissy-analyst/[id]`, `/financial-modeler/[id]`). Also called **`filesId`** in some components. |
| **`job_id` / `jobId`** | **`jobs.id`** (via `user_files.job_id` or nested `jobs`) | APIs, chat scope, reports, SAT credential URLs keyed by job, unit conversion, tickets tied to a job, etc. |
| **`extraction_job_id`** | Separate SAT **extraction** run id | SAT analytics and extraction flows; **not** interchangeable with `job_id`. Routes like `.../sat-analytics/[extractionJobId]` use this alongside resolving **`jobId`** from file data. |
| **`linkId`** | Shareable folder link | Shareable-links UI; lists jobs under a folder, still keyed by normal job/file ids in payloads. |

So: **navigation often uses `user_files.id`**, while **business logic and backend contracts use `job_id`** once the file row is loaded.

---

## How we resolve `jobId` from a route

Analyst pages receive **`params.id`** as the **`user_files`** id. The **`Agent`** shell loads data with **`useGetSheetAndFiles({ id })`**, which queries the API selecting **`job_id`** and nested **`jobs`**. The **`jobId`** used everywhere below is **`row.job_id`** (mapped to `jobId` in the result object).

```92:100:src/components/modules/protected/agents/api/sheet-and-files.ts
    const result = {
      files: row.files as IDocument[] | null,
      outputExcel: row.output_excel,
      jobId: row.job_id,
      jobStatus: jobsData?.status || null,
      jobType: jobsData?.job_type || 'Cissy',
      templateUrl: row.template_url || undefined,
      apiMetadata: row.api_metadata || null,
    };
```

```70:71:src/components/modules/protected/agents/index.tsx
  // Extract jobId from data
  const jobId = data?.jobId;
```

That pattern is the **bridge** from URL **`[id]` = file row** to **`jobId` = job**.

The SAT analytics page documents explicitly that **`params.id`** is the **user_files** id, and resolves **`actualJobId`** from fetched data’s **`jobId`** before rendering:

```11:14:src/app/(protected)/Cissy-analyst/[id]/sat-analytics/[extractionJobId]/page.tsx
  const filesId = params?.id as string; // This is the user_files ID, not the job ID
  const extractionJobId = params?.extractionJobId as string;
  const { data, isFetching, error } = useGetSheetAndFiles({ id: filesId ?? '' });
  const actualJobId = useMemo(() => data?.jobId ?? null, [data?.jobId]);
```

---

## Dashboard / history list: how `jobId` appears in rows

History rows are built from **`user_files`** plus nested **`jobs`**. Here **`jobId`** in **`IHistory`** is **`jobs.id`** (same value as **`user_files.job_id`**):

```96:104:src/components/modules/protected/dashboard/history/api/get-history.ts
    return {
      id: history.id,
      files: history?.files as IDocument[] | null,
      status: (jobsData?.status ?? FileStatus.PROCESSING) as FileStatus,
      last_edited: jobsData?.updated_at,
      jobId: jobsData?.id || '',
      progress: jobsData?.progress || 0,
      filesId: history.id,
```

Links from **`JobCard`** / **`ProjectCard`** typically navigate using **`id`** / **`filesId`** for the path (file row), while actions that need the backend job use **`jobId`** (delete, OCR fetch, etc.).

---

## Where `job_id` / `jobId` is used (by area)

These are representative; grep for `jobId` / `job_id` for an exhaustive list.

| Area | Role of `jobId` |
|------|------------------|
| **Chat (Zustand)** | `src/lib/store/chat.ts` — `jobId` scopes the active conversation to a job. |
| **Detailed document / reports** | `src/lib/services/detailed-document-service.ts` — paths like `saved-reports/${jobId}`, `report-generation/${jobId}/verify-company`. |
| **SAT** | `src/lib/hooks/use-sat-extraction.ts`, `use-sat-credentials.ts` — payloads and cache keys include `job_id` / `jobId`. |
| **Unit conversion** | `src/services/api/unit-conversion.ts` — `/convert-job/${jobId}`, `/detect-job/${jobId}`. |
| **Shareable links** | `src/services/api/shareable-links.ts` — API types include `job_id` / `jobId` for folder jobs and rename flows. |
| **Patch upload / misc API** | `src/components/common/api/patch-upload.ts` and related — job-scoped operations. |
| **Tickets** | Report/ticket flows pass `jobId` where the ticket refers to a job (e.g. `report-button`, ticket modals). |
| **Agents UI** | `src/components/modules/protected/agents/index.tsx` — passes `jobId` into Cissy/contract/excel subtrees, `ReportButton`, `SATExtractionManager`, etc. |
| **Admin** | Sheet/files admin mapping includes `job_id` → `jobId` (`sheet-and-files-admin.ts`). |

---

## Conventions

1. **Prefer `jobId` in new React/TS code**; reserve **`job_id`** for API shapes that mirror the database or backend JSON.
2. **When adding a route**, decide whether the segment is a **file row id** (common for analyst URLs) or a **job id** (rare; only if the API contract requires it explicitly). If it is a file row id, **load `jobId` from `useGetSheetAndFiles` (or org/admin variants)** before calling job-scoped APIs.
3. **Do not use `user_files.id` where the backend expects `jobs.id`** — that mismatch causes subtle bugs in chat, reporting, and SAT.

---

## Related types

- **`src/types/supabase.ts`** — `job_id` on `user_files` and related tables.
- **`IHistory`** in `src/components/modules/protected/dashboard/history/columns.tsx` — **`jobId`** + **`filesId`** / **`id`** for the same row.

This keeps **`jobs.id`** (exposed as **`job_id` / `jobId`**) the **single source of truth** for job-scoped behavior, while **`user_files.id`** remains the usual **routing key** to load that job’s context.

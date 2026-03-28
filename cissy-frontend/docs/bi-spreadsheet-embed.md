# BI spreadsheet pane — expected links and CSV

This document describes what the **Excel / spreadsheet viewer** in the BI workspace expects. The implementation lives in **`BiSpreadsheetPane`** (`src/components/modules/bi/bi-spreadsheet-pane.tsx`).

## What the component does

- It renders an **`<iframe>`** whose `src` is your URL.
- It does **not** download, parse, or render **CSV files** as tabular data in React. If you pass a link to a raw `.csv` file, the browser will show whatever the server returns (often plain text or a download), not a spreadsheet UI—unless that URL is a **hosted viewer** (for example Google Sheets).

So “CSV spread” in product language usually means **a spreadsheet shown in the left pane**; technically the app expects an **embeddable HTTP(S) URL**, with **Google Sheets** as the supported first-class case.

## Link types

| Kind | Supported? | Notes |
|------|------------|--------|
| **Google Sheets** (`docs.google.com/.../spreadsheets/...`) | **Yes (recommended)** | The app adds `widget=true` and `headers=false` if missing, for a compact embed-friendly view. |
| **Other HTTPS pages** | **Best-effort** | Passed through as-is. Must be allowed to load in an iframe (`X-Frame-Options` / CSP from the **remote** site apply). Many sites block embedding. |
| **Raw `.csv` file URL** (S3, CDN, API) | **Not ideal** | No CSV parser in this component; iframe may show text or trigger download. Use a Sheet or a viewer URL instead. |
| **`file://` or local paths** | **No** | Use a publicly reachable `https://` URL. |

### Google Sheets URL shape

Use a normal edit or view URL, for example:

```text
https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit
```

Publishing / sharing must allow the document to be loaded in a frame where your app runs (Google’s default for “anyone with the link” or shared viewers is usually fine for embedding the sheet UI).

### Encoding for `?excel=`

Per-job override on the BI route:

```text
/bi/<jobId>?excel=<url-encoded-sheet-url>
```

The full spreadsheet URL must be **URL-encoded** (e.g. `encodeURIComponent` in JS, or paste through an encoder). Example pattern:

```text
/bi/00000000-0000-4000-8000-000000000001?excel=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F...%2Fedit
```

## Configuration

1. **Environment (default for all BI jobs without `?excel=`):**  
   `NEXT_PUBLIC_BI_SPREADSHEET_URL` — optional; must be a full `https://...` string (see `.env.example`).

2. **Query param (per visit):**  
   `searchParams.excel` on `/bi/[jobId]` — highest priority when passed from the page (see `src/app/(app)/bi/[jobId]/page.tsx`).

Resolution order for a **single** embed: **`?excel=`** from the page, else **`NEXT_PUBLIC_BI_SPREADSHEET_URL`**, else (if no tab list) empty → empty state UI.

When **`src/config/bi-spreadsheet-tabs.ts`** (or **`NEXT_PUBLIC_BI_SPREADSHEET_TABS`**) defines a tab list, those URLs are used first; each entry is a **full** `https://docs.google.com/spreadsheets/d/.../edit?gid=...` link. **Different spreadsheet IDs per tab are supported** (multiple files).

## Multiple sheets (dropdown + prev/next)

For **Google Sheets**, the viewer can switch with **Previous / Next** and a **dropdown**. While the iframe loads, a **loading** state is shown.

1. **Config in code (default):** edit **`src/config/bi-spreadsheet-tabs.ts`** — list `{ name, url }` rows with a **full Sheet URL** each (copy from the browser address bar or **Share → Copy link**).

2. **Config in env (overrides the file):** set **`NEXT_PUBLIC_BI_SPREADSHEET_TABS`** to a **JSON array**:

   ```text
   NEXT_PUBLIC_BI_SPREADSHEET_TABS=[{"name":"Aisles","url":"https://docs.google.com/spreadsheets/d/.../edit?gid=..."},{"name":"Departments","url":"https://..."}]
   ```

   Use a **single line** in `.env` or quote the whole value if your loader requires it.

If only one tab is configured, the tab bar is hidden.

## Iframe permissions

The iframe is created with `allow="clipboard-read; clipboard-write"` for typical sheet copy/paste. Third-party cookie / login behavior inside the iframe depends on Google (or the embedded site), not this repo.

## Summary

- **Expect:** absolute **`https://`** links suitable for **iframe** embedding; **Google Sheets** URLs are explicitly normalized for embed.
- **Do not expect:** in-app CSV parsing, column typing, or file upload in **`BiSpreadsheetPane`**—that would be a different feature.

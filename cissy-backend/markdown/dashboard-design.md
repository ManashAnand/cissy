# BI dashboard — UI scope (cissy-frontend)

This note captures what the dashboard should show and what we **omit** for a simplified English-only experience. Copy and labels are **plain English** only (no i18n / language switcher).

**Visual language:** Use **icons** from a single icon set (e.g. **Lucide** via `lucide-react`, already in the project) for stats cards, actions, and empty states. **Do not** rely on raster reference screenshots or custom image assets for these surfaces—icons keep the UI consistent and lightweight.

---

## Global exclusions (do not build or show)

| Item | Notes |
|------|--------|
| **Upload documents** | Omit the large drag-and-drop upload module (dashed area, browse, format badges, paste hint). |
| **Shareable folder** | Omit the “Shareables Folder” (or similar) control. |
| **Org-scoped jobs** | Omit any org-wide jobs entry point not in scope for this product. |
| **View projects** | Omit the separate “View Projects” navigation control (see below for still needing **project card data** in the main flow you keep). |
| **Settings** | Omit settings entry from this bar. |
| **i18n** | No language selector, no translation keys for this surface — fixed **English** copy throughout. |

---

## Header (keep, simplified)

- Product branding: **Conversational BI** (or **Financial Analysis**) with path to **Dashboard**.
- Right side: keep **zoom** (`- 100% +` and reset) if the product still needs it; **omit** the country-flag language selector.
- **Theme** toggle (sun/moon) — optional; keep if the rest of the app uses it.
- **User** avatar / name — keep (or omit if unauthenticated single-user; align with product).

---

## Main dashboard — greeting (keep)

- Primary: time-based greeting, e.g. **“Good afternoon, {FirstName}”** (or a neutral **“Welcome”** if no profile).
- Subtitle: e.g. **“Welcome back to your analysis dashboard”**.

---

## Primary actions row (what to keep vs change)

**Remove as buttons:** Shareable folder, org jobs, View projects, Settings.

**Upload / “New Analysis”:** Omit the **upload documents** module. If **New Analysis** only opens that upload experience, omit or replace it with whatever entry point product defines (e.g. **New chat** for BI).

**Report issue:** Do **not** use a full button style. Use **plain text** only (e.g. a text link **“Report issue”** to your support destination).

---

## Statistics cards — data to support (keep this shape)

Four summary cards in one row. Each card uses an **icon** (Lucide or equivalent) in the corner or header—**no illustration PNGs**. Values are **examples**; real data comes from the API.

### 1. Total projects

| Field | Example | Notes |
|-------|---------|--------|
| Label | Total Projects | |
| Main value | `170` | Count of projects / jobs in scope. |
| Subtext | `12 completed` | Secondary metric. |
| Status chip | Active (green) | Optional top-right indicator. |
| Icon | `BarChart3` or similar | Icon component, not an image asset. |

### 2. Documents processed

| Field | Example | Notes |
|-------|---------|--------|
| Label | Documents Processed | |
| Main value | `12` | |
| Subtext | Files analyzed | |
| Status chip | Active (green) | Optional. |
| Icon | `FileText` or `FileStack` | Icon component. |

### 3. Average processing time

| Field | Example | Notes |
|-------|---------|--------|
| Label | Average Processing Time | |
| Main value | `1.5 min` | |
| Subtext | Per document | |
| Icon | `Clock` | Icon component. |

### 4. Pending analysis

| Field | Example | Notes |
|-------|---------|--------|
| Label | Pending Analysis | |
| Main value | `158` | |
| Subtext | In progress | |
| Status chip | Pending (orange) | Optional. |
| Icon | `Loader2` (animated) or `Hourglass` | Icon component; optional subtle spin via CSS on `Loader2`. |

---

## Projects area — “Your projects” (card data to keep)

Use English-only strings. Structure matches the **Your Projects** view: title, subtitle, search, status filter, grid/list toggle, document count badge, and **project cards**. Status and actions can use **icons** + labels (e.g. check icon for completed) instead of bitmap badges.

### Page chrome

- **Title:** Your Projects  
- **Subtitle:** Track your document analysis projects and their progress.  
- **Search:** placeholder e.g. `Search projects, companies, files...`  
- **Status filter:** dropdown, e.g. default **All Status**  
- **View toggle:** grid vs list (use **icons**: `LayoutGrid`, `List`)  
- **Count badge:** e.g. `12 documents` (or project count — align naming with backend)

### Project card — fields (each card)

| Field | Description |
|-------|-------------|
| **Status** | Badge, e.g. Completed (green check **icon** + text). |
| **Title** | e.g. **Credit Analysis** (job type label). |
| **Company name** | Editable text field; placeholder **Enter company name** or saved value. |
| **File count** | e.g. `1 file` with **file icon** (`File` / `Paperclip`), not an image. |
| **Last updated** | Relative time, e.g. **about 11 hours ago**. |
| **Launch readiness** | Short line, e.g. green dot + **Ready to launch** (or **Ready**). |
| **Actions** | **Add Files**, **Launch** (primary), **Delete**, **Info** (opens details), **Documents** (opens files/docs). Prefer **icon + text** or icon-only with `aria-label` where space is tight. |

Adjust which actions stay if product scope changes; the **data fields** above are the minimum to preserve.

---

## Project details (info popover) — data to keep

Opened from the **info** icon (`Info` / `CircleHelp`) on a card. English-only labels.

| Label | Example value | Notes |
|-------|----------------|--------|
| **Job ID** | `35eac9f5-0f43-41ed-8854-9201401c86f6` | UUID; primary identifier for the job (`job_id` in data model). Show in a monospace or selectable block. |
| **Created** | `Mar 28, 2026 at 12:34 AM` | Absolute timestamp. |
| **Files** | `1 file` | Count. |
| **Type** | `Credit Analysis` | Job / product type string. |

This aligns with **`job_id` as the single source of truth** for backend and routing resolution (see [`job_id_source_of_truth.md`](./job_id_source_of_truth.md)).

---

## Summary checklist

- [ ] No upload-documents module on this page.  
- [ ] No Shareable folder, org jobs, View projects, or Settings in the action row.  
- [ ] **Report issue** as text only, not a full button treatment.  
- [ ] No i18n — English copy only, no language selector.  
- [ ] Include **four stat cards** with the metrics structure above; **icons via Lucide (or chosen set), not PNG assets.**  
- [ ] Include **project list/cards** and **Project details** popover with **Job ID** + metadata as specified.  
- [ ] No **truffles.ai** or third-party product branding in copy or URLs.

---

## Reference (icons, not screenshots)

Do **not** depend on checked-in dashboard PNGs. For implementation:

- Use **`lucide-react`** icons consistently with the names suggested in each section above.
- For layout/spacing, follow this document and the live app shell (`AppShell`, cards, typography), not raster references.

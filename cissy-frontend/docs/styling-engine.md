# Styling engine and design model (Cissy-frontend-)

This document describes **how this project is customized visually**: tooling, tokens, themes, typography, motion, and where gradients and component-level styles appear. Use it as the **company / product styling reference** when extending UI or aligning new screens with the existing app.

---

## 1. Styling stack (the “engine”)

| Layer | Technology | Role |
|-------|------------|------|
| **Utility CSS** | [Tailwind CSS](https://tailwindcss.com/) `3.4.x` | Layout, spacing, colors via tokens, responsive breakpoints, state variants (`dark:`, `hover:`, etc.). |
| **Processing** | PostCSS + Autoprefixer (`postcss.config.js`) | Compiles Tailwind and applies vendor prefixes. |
| **Animation** | `tailwindcss-animate` | Accordion and other preset animations registered in `tailwind.config.ts`. |
| **Prose** | `@tailwindcss/typography` | Markdown / long-form content (`.prose` classes). |
| **Component primitives** | [shadcn/ui](https://ui.shadcn.com/) **“New York”** style (`components.json`) | Radix-based components under `src/components/ui/`. Base color template: **slate**; **CSS variables** enabled. |
| **Headless UI** | [Radix UI](https://www.radix-ui.com/) | Accessible primitives (Dialog, Select, Tabs, etc.). |
| **Class merging** | `clsx` + `tailwind-merge` (`src/lib/utils.ts` → `cn()`) | Composes conditional classes and **deduplicates** conflicting Tailwind utilities. |
| **Variants** | `class-variance-authority` (CVA) | Button and other components use typed variant APIs (e.g. `buttonVariants` in `src/components/ui/button.tsx`). |
| **Themes** | [next-themes](https://github.com/pacocoursey/next-themes) (`src/lib/providers/theme.tsx`) | `ThemeProvider` with `attribute="class"`, `defaultTheme="system"`, `enableSystem` — toggles the `.dark` class on `<html>`. |
| **Global CSS** | `src/styles/globals.css` | Tailwind layers, **design tokens** (`:root` / `.dark`), and **feature-specific** rules (chat, agent messages, sidebar, scrollbars). |

**Config entry points**

- `tailwind.config.ts` — content paths (`./src/**/*.{ts,tsx}`), `darkMode: ["class"]`, extended colors mapped to `hsl(var(--token))`, container, keyframes, animations.
- `components.json` — shadcn schema, aliases `@/components`, `@/lib/utils`, CSS path `src/styles/globals.css`.

---

## 2. Theme model: light and dark

### 2.1 Activation

- **Dark mode** is **class-based**: Tailwind `darkMode: ["class"]`.
- **`next-themes`** adds or removes the **`dark`** class on the document root; components use **`dark:`** variants.
- Default theme follows **system** until the user changes it.

### 2.2 Token source of truth

Semantic colors are **HSL tuples** (without `hsl()`) stored in CSS variables in `src/styles/globals.css`:

- **`:root`** — light theme.
- **`.dark`** — dark theme overrides.

Tailwind maps these to named colors in `tailwind.config.ts` (e.g. `background: "hsl(var(--background))"`, `primary.100: "hsl(var(--primary-100))"`).

**Rule for contributors:** Prefer **`bg-background`**, **`text-foreground`**, **`border-border`**, **`bg-primary`**, **`text-primary-foreground`**, etc., instead of hard-coded hex values, **unless** you are in a one-off marketing gradient (see §4).

---

## 3. Color system (brand and semantics)

### 3.1 Primary (purple / violet brand)

The brand is a **purple family** with multiple steps. Comments in CSS document the intent:

| Token | Light notes (from `globals.css`) |
|-------|----------------------------------|
| `--primary` | Light lavender tint (`256, 93.3%, 88.2%`). |
| `--primary-foreground` | Near-black text on primary. |
| `--primary-50` … `--primary-400` | Scale including **`--primary-100`** → **#8644ED** (main brand violet). |
| `--primary-300` | **#CACEFF** (soft tint). |

**Dark theme** reuses the same primary scale for consistency; surfaces shift (e.g. `--background` ≈ deep purple-gray `252, 12.2%, 8.04%`).

**Usage in Tailwind:** `bg-primary`, `text-primary-100`, `border-primary-300/50`, `hover:bg-primary-100`, etc.

### 3.2 Surfaces and borders

| Token | Purpose |
|-------|---------|
| `--background` / `--foreground` | Page background and default text. |
| `--card` / `--card-foreground` | Cards (light: `#F6F7F9` tint family; dark: `#252729`). |
| `--popover` | Popovers / dropdown surfaces. |
| `--border`, `--input`, `--ring` | Borders, inputs, focus rings. |
| `--muted` / `--muted-foreground` | Secondary blocks and de-emphasized text. |
| `--accent` / `--accent-foreground` | Hover / subtle highlights. |
| `--secondary` / `--secondary-foreground` | Secondary buttons and panels; dark adds `--secondary-50`. |

### 3.3 Semantic status colors

| Token | Light intent (from comments) |
|-------|------------------------------|
| `--destructive` | Error / danger (red family). |
| `--success` | **#119DA4** (teal) — success actions and positive states. |
| `--info` | **#1689FC** — informational accents. |

Tailwind: `text-destructive`, `bg-success`, `text-info`, etc.

### 3.4 Domain-specific tokens

| Token | Use |
|-------|-----|
| `--dropzone` / `--dropzone-hover` | Upload / dropzone surfaces and hover tint. |

### 3.5 Radius

- **`--radius: 0.5rem`** — default corner radius.
- Tailwind: `rounded-lg` → `var(--radius)`, `md`/`sm` derive from it in `tailwind.config.ts`.

---

## 4. Gradients and accent treatments

There is **no single global gradient token**. Gradients are applied **locally** with Tailwind utilities, often combined with brand or neutral grays:

**Patterns in the codebase**

- **Dashboard heading** — `bg-gradient-to-r from-gray-900 to-gray-700` with `bg-clip-text text-transparent` (light); `dark:from-gray-100 dark:to-gray-300` for dark mode (`src/components/modules/protected/dashboard/index.tsx`).
- **Agent / Excel chrome** — subtle horizontal bars: `bg-gradient-to-r from-primary-300/10 to-primary-100/5` with borders (`agents/index.tsx`, excel chat headers).
- **Dropzone** — soft overlay: `bg-gradient-to-br from-transparent via-gray-50/30 to-gray-100/20` (dark variants use gray-700/600).
- **Steps / onboarding** — green success band: `from-green-50 to-green-100` (dark: green-950/900 opacity).
- **SAT extraction actions** — full-color **CTA gradients** (blue→cyan, purple→pink, orange→amber, emerald→teal, etc.) in `sat-extraction-manager.tsx` (feature-specific, not global tokens).
- **Navbar CTA** — `from-blue-600 to-indigo-600` (`navbar/index.tsx`).

**Guidance for new UI**

- Prefer **token-based** fills for product chrome (`primary`, `card`, `muted`).
- Use **gradients** sparingly for **hero text**, **subtle section headers**, or **isolated CTAs**; align purple CTAs with `primary-*` where possible; reserve **multi-hue** gradients for clear **action** or **status** moments.

---

## 5. Typography and text

### 5.1 Defaults

- Root layout applies **`antialiased`** on `<body>` (`src/app/layout.tsx`).
- There is **no** `next/font` family applied globally in the root layout — **body text uses the Tailwind / system stack** unless a component sets a font explicitly.

### 5.2 Scale and rhythm

- **Prose** (`.prose` in `globals.css`): `text-base leading-relaxed`; lists and spacing tuned for markdown.
- **Agent chat** (`.agent-message`): `font-size: 14.5px`, `line-height: 1.6`; links and citations use **`hsl(var(--primary-100))`**.
- **Chat bubbles** (`.chat-message`): ~`0.925rem` with rounded corners; user messages use **`primary-100` at ~15% opacity** for background.

### 5.3 Code

- `code-block.tsx` and globals reference **`var(--font-mono)`** for monospace. Define **`--font-mono`** on `:root` when introducing a global monospace stack (e.g. via `next/font`).

### 5.4 Legacy / optional variables

- Some rules reference **`var(--color-text-900)`** and **`var(--color-primary-300)`** in `globals.css`. Prefer Tailwind **`foreground`** / **`primary-300`** in new code; align legacy rules with `:root` if those custom properties are not set in your environment.

### 5.5 Selection

- `::selection` uses **`bg-blue-500/40`** with `text-foreground` (tweak here for brand-consistent selection if desired).

---

## 6. Motion and interaction

**Tailwind keyframes** (`tailwind.config.ts`)

- `accordion-down` / `accordion-up` — Radix accordion height.
- `fadeIn`, `slideIn` — entrance motion.
- `typing-cursor` — blink for streaming UIs.

**globals.css**

- **`pulse-highlight`** — indigo pulse for text selection highlights (`#text-selection-highlight`).
- **`cursor-pulse` / `cursor-blink`** — streaming cursor near **`primary-100`**.
- **`thinking-pulse`** — thinking dots (references `var(--color-primary-300)` in one place; prefer `primary-300` token alignment when adding new styles).
- **Sidebar / resize** — transitions on `.main-content`, `.Cissy-layout`, `.resize-handle-*`, `.sidebar-container`.

**Framer Motion** is a dependency (`package.json`) for animated UI where used in components.

---

## 7. Layout primitives

- **Container** — `center: true`, `padding: 2rem`, max width **`2xl: 1400px`** (`tailwind.config.ts`).
- **Cissy analyst layout** — `.Cissy-layout` flex row; **`body.sidebar-wide`** switches to column; `.file-panel` / `.spreadsheet-panel` share flex rules and min-heights (`globals.css`).
- **Sidebar** — **`--sidebar-width`** (default `450px`) adjusts main content width when open (`body.sidebar-open`).

---

## 8. Component styling conventions (shadcn + custom)

**Buttons** (`src/components/ui/button.tsx`)

- **Shape:** `rounded-full` for pill buttons.
- **Default variant:** `bg-primary text-primary-foreground`, hover toward **`primary-100`**.
- **Variants:** outline, secondary, ghost, destructive, link (link uses **`success`** for underline accent).
- **Focus:** `focus-visible:ring-1 focus-visible:ring-ring`.

**Pattern:** Use **`cn(buttonVariants({ variant, size }), className)`** or **`cn()`** for any component that merges Tailwind with props.

---

## 9. Third-party and toast

- **Sonner** toaster — `richColors`, `position="top-center"` in root layout (`src/app/layout.tsx`).
- **Charts** — Recharts / Chart.js usage in features; style via container + tokens for consistency.

---

## 10. Checklist when adding new UI

1. Use **`hsl(var(--...))`** tokens via Tailwind (`bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`, etc.).
2. Add **`dark:`** variants for any new surface or text that must not rely on a single theme.
3. Merge classes with **`cn()`** from `@/lib/utils`.
4. Prefer **CVA** for components with multiple visual variants.
5. Put **rare, global** rules in `globals.css` `@layer base` or at the bottom; keep **feature-specific** layout in co-located modules or scoped classes.
6. For **gradients**, either reuse existing patterns (primary-tint headers, gray text clip) or document new ones in this file.

---

## 11. File map (quick reference)

| File | Contents |
|------|----------|
| `tailwind.config.ts` | Tailwind theme, colors → CSS variables, animations, container, content globs. |
| `src/styles/globals.css` | `:root` / `.dark` tokens, prose, agent/chat/sidebar/scrollbar, keyframes. |
| `src/lib/utils.ts` | `cn()` helper. |
| `src/lib/providers/theme.tsx` | `next-themes` wrapper. |
| `src/app/layout.tsx` | Global `body` classes, Toaster, providers. |
| `components.json` | shadcn style, paths, aliases. |
| `src/components/ui/*` | Shared primitives (buttons, inputs, dialogs) — first place to mirror design changes. |

This setup is the **Financial Analysis / Truffles** frontend styling model: **purple-forward primary**, **HSL semantic tokens**, **class-based dark mode**, **Tailwind + shadcn**, with **gradients and strong accents** used intentionally at the **feature** layer rather than in a single global stylesheet.

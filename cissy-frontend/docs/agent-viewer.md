# Credit Analyst route — layout spec

**Example URLs (same app, different job types):**

| Route | Example |
|-------|---------|
| **Credit Analyst** | [analyst.truffles.ai/credit-analyst/9dfae7f8-6acd-46a8-92ce-85fce2c2bc06](https://analyst.truffles.ai/credit-analyst/9dfae7f8-6acd-46a8-92ce-85fce2c2bc06) |
| **Contract Analyst** | [analyst.truffles.ai/contract-analyst/2727fd0a-0614-4711-a193-0106e2d606b0](https://analyst.truffles.ai/contract-analyst/2727fd0a-0614-4711-a193-0106e2d606b0) |

The path segment (UUID) is **`user_files.id`** (file row id). The **`job_id`** used by APIs is resolved after loading sheet/file data — see `learn/JOB_ID_SOURCE_OF_TRUTH.md`.

**Contract Analyst** is the reference for **inline citations** in assistant messages (badges → navigate to document page). **Credit** chat already uses the same SSE hook for **Chart.js** graphs. The **target** for Credit Analyst is **RndWindow** UX **plus** both **citations** and **graphs** in the assistant thread (see §5–§8).

**Reference screenshot (repo):** `learn/assets/credit-analyst-route-reference.png`

---

## 1. Route wiring (App Router)

The page file only mounts the **`Agent`** shell with the dynamic **`id`** param:

```tsx
// src/app/(protected)/credit-analyst/[id]/page.tsx
import { Agent } from "@/components/modules/protected/agents";

export default function LoanCalculatorPage({
  params,
}: Readonly<{
  params: { id: string };
}>) {
  return <Agent params={params} />;
}
```

All credit-analyst-specific layout (panels, PDF, spreadsheet, chat) lives inside **`Agent`** (`src/components/modules/protected/agents/index.tsx`).

---

## 2. Target experience (what we want)

| Keep | Role |
|------|------|
| **Excel viewer** | Embedded spreadsheet for **Credit Spreads (Output)** — today an **iframe** to the Google Sheet URL from `outputExcel`. |
| **Flexible chatbot** | **Assistant** chat: docked sidebar, **pop-out** floating window, resize, drag — **`RndWindow`** + **`Chat`**. |
| **Citations** | Model output can include `{{cite:{...}}}` tokens; UI shows **reference badges** and jumps to PDF page (pattern from **Contract** `ContractMessageContent`). |
| **Graphs / charts** | SSE stream can attach **Chart.js** configs to messages; UI renders **`MessageCharts`** (pattern from **Credit** `MessageItem` + `useStartConversation`). |

| Remove / omit | Role |
|---------------|------|
| **PDF viewer** | Left pane titled **PDF Documents** / **Financials (Input)** — **`CreditFiles`** and PDF pop-out / minimize chrome. |
| **SAT Credentials** | Navbar button + **`SATManagementModal`** on credit analyst routes. |

---

## 3. How the Excel viewer is implemented today

For standard credit jobs (not financial-model / excel agent types), **`CreditAnalyst`** renders a full-size iframe and mounts **`Chat`** on top:

```tsx
// src/components/modules/protected/agents/credit/index.tsx (simplified)
export function CreditAnalyst({ jobId, outputExcel, files = [] }) {
  return (
    <div className="relative w-full h-full">
      <iframe
        title="Financial Agent"
        width="100%"
        height="100%"
        className="border-none w-full h-full"
        src={`${outputExcel}?widget=true&headers=false`}
        style={{ minHeight: "100%", height: "100%" }}
      />
      {jobId && <Chat jobId={jobId} files={files} />}
    </div>
  );
}
```

- **`outputExcel`** comes from **`useGetSheetAndFiles`** → backend `user_files.output_excel` (Google Sheets URL).
- **`Chat`** receives **`jobId`** for history and streaming APIs.

This is the **Excel viewer component** to preserve when the PDF column is removed: the **main surface** becomes a single column (or full-width) spreadsheet area.

---

## 4. How the flexible chatbot is implemented today

**`Chat`** wires history, Zustand store, and UI:

```tsx
// src/components/modules/protected/agents/credit/chat/index.tsx (simplified)
export default function Chat({ jobId, files = [] }) {
  const { data: chatHistory } = useGetChatHistory(jobId);
  const { setConversations, setIsLoading, setJobId } = useChatStore();

  useEffect(() => {
    if (chatHistory) setConversations(chatHistory);
    setJobId(jobId);
    setIsLoading(false);
  }, [chatHistory, jobId, /* ... */]);

  return (
    <RndWindow>
      <div className="h-full flex flex-col">
        <CreditTranslationHandler />
        <ChatBody files={files} />
        <InputBox />
      </div>
    </RndWindow>
  );
}
```

**`RndWindow`** (`rnd-window.tsx`) provides:

- **`Assistant`** tab on the edge when closed; click opens the panel.
- **Docked** sidebar (`body.sidebar-open`, `--sidebar-width` in `globals.css`).
- **Pop out** to a **floating, draggable** window (`resize`, `popoutPosition`, `isPoppedOut`).
- **Resize** handles and optional “wide” layout (`body.sidebar-wide` → credit layout stacks vertically).

That is the **“flexible to stick out”** behavior: not a fixed modal — user can dock, undock, and move the chat.

---

## 5. Contract Analyst route (reference for citation-rich chat UI)

Contract Analyst uses a **dedicated wrapper** (feature-flagged) and **`ContractAnalyst`** → **`ContractChat`** (inline panel, not `RndWindow`):

```tsx
// src/app/(protected)/contract-analyst/[id]/page.tsx
import { ContractAgentWrapper } from "@/components/modules/protected/agents/contract-agent-wrapper";

export default function ContractAnalystPage({
  params,
}: Readonly<{ params: { id: string } }>) {
  return <ContractAgentWrapper params={params} />;
}
```

```tsx
// src/components/modules/protected/agents/contract/index.tsx (simplified)
export function ContractAnalyst({ jobId, outputExcel }) {
  if (!jobId) return /* empty state */;
  return (
    <div className="absolute inset-0 p-2">
      <ContractChat jobId={jobId} />
    </div>
  );
}
```

Files + spreadsheet split is in **`ContractAgentWrapper`** (`ResizablePanel`: **`Files`** | **`ContractAnalyst`**). The **chat** surface is where **citation badges** and markdown appear — reuse this rendering behavior inside Credit’s **`ChatBody`** / message components when aligning features.

---

## 6. Citations — how Contract chat renders them

Assistant text may embed machine-readable citations, e.g. `{{cite:{"type":"document","file":0,"page":5}}}`. **`processCitations`** in **`ContractMessageContent`** replaces those with numbered refs and collects structured **`Citation`** objects; after markdown render, **badges** let the user jump to **Doc / Page** (via `useFilesStore` navigation).

```tsx
// src/components/modules/protected/agents/contract/chat/message-content.tsx — pattern (abbreviated)
const citationRegex = /{{?cite:(\s*\{[^{}]*\}\s*)}}?/g;

function processCitations(text: string): { cleanedText: string; citations: Citation[] } {
  let cleanedText = text;
  const citations: Citation[] = [];
  cleanedText = cleanedText.replace(citationRegex, (match, jsonStr) => {
    const citation = JSON.parse(/* normalized */ jsonStr) as Citation;
    const citationId = citations.length;
    citations.push(citation);
    return `[${citationId}]`;
  });
  return { cleanedText, citations };
}
```

```tsx
// After <ReactMarkdown>… — reference badges (abbreviated)
{!isStreaming && uniqueCitations?.length > 0 && (
  <div className="mt-3 flex flex-wrap gap-2">
    <div className="w-full text-xs font-medium text-muted-foreground">References:</div>
    {uniqueCitations.map((citation, index) => (
      <Badge
        key={`citation-${index}`}
        variant="outline"
        onClick={() => navigateToDocumentPage(citation.file, citation.page)}
      >
        Doc {citation.file + 1}, Page {citation.page}
      </Badge>
    ))}
  </div>
)}
```

**Credit** chat today uses **`MessageContent`** (`credit/chat/message-content.tsx`) with KaTeX/markdown; it does **not** duplicate this `{{cite:…}}` pipeline. To match Contract behavior in the Credit Analyst assistant, **share or port** `processCitations` + badge UI (or extract a **`SharedAssistantMessageContent`** used by both).

---

## 7. Charts / graphs — how Credit chat renders them

Conversation rows follow **`TConversation`** in `src/lib/store/chat.ts`, including optional **`charts`** (Chart.js configuration blobs):

```ts
// src/lib/store/chat.ts — excerpt
export type TConversation = {
  role: "assistant" | "user";
  content: string;
  tool_calls?: /* … */;
  reasoning_summaries?: ReasoningSummary[];
  charts?: any[];
};
```

The SSE client in **`useStartConversation`** (`credit/chat/hooks/use-start-conversation.tsx`) parses stream events, accumulates **`pendingCharts`**, merges them into the final assistant message, and normalizes configs (e.g. `fixChartConfig` for Chart.js). **`MessageItem`** collects charts from **`props.charts`** or nested **`tool_calls`**, then renders:

```tsx
// src/components/modules/protected/agents/credit/chat/message-item.tsx — pattern (abbreviated)
import MessageCharts from "@/components/Chat/MessageCharts";

{!isThinking && role === "assistant" && charts?.length > 0 && isChartsVisible && (
  <div className="mt-4 w-full overflow-x-auto">
    <div className="text-sm font-medium">Data Visualization ({charts.length})</div>
    <MessageCharts charts={charts} containerWidth={containerWidth} />
  </div>
)}
```

**`MessageCharts`** (`src/components/Chat/MessageCharts.tsx`) delegates to **`ChartRenderer`** (Chart.js). Contract **`ContractMessageItem`** does **not** currently mount **`MessageCharts`**; graph parity for Contract vs Credit is **SSE + message shape** dependent. For **Credit Analyst**, charts are already on the Credit path — keep **`ChatBody`** + **`MessageItem`** when adding citations.

---

## 8. Combining behavior for Credit Analyst (recommended direction)

| Capability | Source in repo | Notes |
|------------|------------------|--------|
| Dock / pop-out / resize | `credit/chat/rnd-window.tsx` | Keep as shell for Credit Analyst. |
| Citations | `contract/chat/message-content.tsx` | Port or share `processCitations` + badges into Credit message rendering. |
| Charts | `credit/chat/message-item.tsx` + `useStartConversation` | Already wired for Credit SSE; verify backend emits `charts` for credit jobs. |

---

## 9. Where the PDF viewer lives (to remove)

In **`Agent`**, a **`ResizablePanelGroup`** splits **PDF** (left) and **spreads** (right). The left panel wraps **`CreditFiles`** (PDF list + viewer):

```tsx
// src/components/modules/protected/agents/index.tsx — structure (abbreviated)
<ResizablePanelGroup direction={isVerticalLayout ? "vertical" : "horizontal"}>
  <ResizablePanel /* PDF */>
    <Heading>… PDF Documents …</Heading>
    <CreditFiles files={data.files ?? []} jobId={jobId} … />
  </ResizablePanel>

  <ResizableHandle />

  <ResizablePanel /* Credit Spreads */>
    <Heading>… Credit Spreads …</Heading>
    <CreditAnalyst jobId={jobId} outputExcel={data.outputExcel} files={data.files ?? []} />
  </ResizablePanel>
</ResizablePanelGroup>
```

Additional PDF UX in the same file:

- **Pop out** / **minimize** floating PDF window (`createPortal`, `isPdfPoppedOut`, `isPdfMinimized`).
- Edge **button** to restore minimized PDF.

**Omitting this** means deleting or feature-flagging the **first** `ResizablePanel` + handle + floating PDF portals, and letting the **spreadsheet panel** use **100%** width (or a simpler single-column layout).

---

## 10. Where SAT Credentials lives (to remove)

On **`Navbar`**, when the path matches credit analyst, a button opens **`SATManagementModal`**:

```tsx
// src/components/common/layout/navbar/index.tsx — pattern (abbreviated)
{pathname?.startsWith("/credit-analyst") && (
  <Button onClick={() => setIsSATCredentialsModalOpen(true)}>
    … SAT Credentials …
  </Button>
)}
<SATManagementModal
  isOpen={isSATCredentialsModalOpen}
  onClose={() => setIsSATCredentialsModalOpen(false)}
/>
```

**Omit** this block (and related imports/state) for the simplified product surface.

---

## 11. Layout comparison

```text
Current (two-panel + assistant):
┌─────────────────────────────────────────────────────────────┐
│ Nav: breadcrumbs … Zoom … [SAT Creds] … User                │
├──────────────────┬──────────────────────────────────────────┤
│ PDF Documents    │ Credit Spreads (Output)                    │
│ CreditFiles      │ iframe → Google Sheet  +  Chat (RndWindow) │
└──────────────────┴──────────────────────────────────────────┘
                                       [ Assistant ] ───────────►

Target (spreadsheet + flexible chat):
┌─────────────────────────────────────────────────────────────┐
│ Nav: breadcrumbs … Zoom … User   (no SAT Creds)               │
├─────────────────────────────────────────────────────────────┤
│ Credit Spreads (Output) — full width                        │
│ Excel viewer (iframe / future component)  +  Chat (Rnd)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. Implementation checklist

- [ ] Route stays **`/credit-analyst/[id]`** → **`Agent`** → **`CreditAnalyst`** for credit jobs.
- [ ] Remove or gate **PDF** `ResizablePanel`, **`CreditFiles`** in this flow, and PDF pop-out/minimize UI.
- [ ] Remove **SAT Credentials** button + **`SATManagementModal`** from navbar for this product.
- [ ] Keep **`CreditAnalyst`** iframe (or replace with a richer **Excel viewer** component that still accepts `outputExcel` + `jobId`).
- [ ] Keep **`Chat`** + **`RndWindow`** for dockable / pop-out assistant.
- [ ] **Citations:** align Credit assistant messages with **`ContractMessageContent`** `{{cite:…}}` handling + reference badges (shared component or port).
- [ ] **Charts:** keep **`MessageItem`** + **`MessageCharts`** + **`useStartConversation`** chart merge path for credit SSE; confirm API emits chart payloads when needed.
- [ ] Ensure **`main-content`** / `globals.css` sidebar rules still behave when only one main column exists (test `sidebar-open` / `sidebar-wide`).

---

## 13. Related files (quick map)

| Path | Purpose |
|------|---------|
| `src/app/(protected)/credit-analyst/[id]/page.tsx` | Route entry |
| `src/components/modules/protected/agents/index.tsx` | Two-panel layout, PDF + spreads |
| `src/components/modules/protected/agents/credit/index.tsx` | Excel iframe + `Chat` |
| `src/components/modules/protected/agents/credit/chat/index.tsx` | Chat composition |
| `src/components/modules/protected/agents/credit/chat/rnd-window.tsx` | Dock / pop-out / resize |
| `src/components/modules/protected/agents/credit-files.tsx` | PDF side (candidate to drop) |
| `src/components/common/layout/navbar/index.tsx` | SAT Credentials |
| `src/app/(protected)/contract-analyst/[id]/page.tsx` | Contract route → `ContractAgentWrapper` |
| `src/components/modules/protected/agents/contract/chat/message-content.tsx` | Citations: `processCitations`, reference badges |
| `src/components/modules/protected/agents/credit/chat/hooks/use-start-conversation.tsx` | SSE, `pendingCharts`, conversation merge |
| `src/components/Chat/MessageCharts.tsx` | Chart.js chart grid for assistant messages |

This spec matches the live **[analyst.truffles.ai](https://analyst.truffles.ai/)** Credit Analyst flow while stating the **intended** slimmed-down UI: **Excel + flexible chatbot** with **citations** (Contract-style) and **graphs** (Credit Chart.js pipeline), **no PDF pane**, **no SAT credentials** entry.

---

## 14. Floating chatbot layout (centered panel over the job)

See **§14** in product requirements: centered float, high `z-index`, gradient welcome, resizable input, optional quick actions. **Cissy:** no fullscreen dim backdrop — the spreadsheet stays fully visible.

### Cissy frontend (`/bi/[jobId]`)

| Piece | Location |
|-------|----------|
| Portal + **`react-rnd`** (no backdrop) | `src/components/modules/bi/bi-floating-chat.tsx` — `createPortal` → `document.body`, **`Rnd`** `z-[9999]`, **drag handle = header only** (`bi-floating-chat-drag`), resize **right / bottom / bottom-right**, **`bounds="window"`**. Close via **Esc** or header buttons. |
| Docked chat (minimized) | `src/components/modules/bi/bi-chat-docked-panel.tsx` — **fixed-width column** beside the sheet (full `ChatShell`, not a narrow tab). |
| Full-width spreadsheet | `src/components/modules/bi/bi-agent-workspace.tsx` — single column + `relative` wrapper for the dock overlay. |
| Floating UI content | `ChatShell` with **`floating`** — gradient welcome, quick actions, **`resize-y`** textarea. |

**Dependency:** `react-rnd` for move + resize (parity with reference **RndWindow** behavior, without the old codebase).

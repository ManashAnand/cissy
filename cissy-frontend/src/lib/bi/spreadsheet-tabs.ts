import { BI_SPREADSHEET_TAB_DEFS } from "@/config/bi-spreadsheet-tabs";

/** One BI sheet: label + full embeddable Google Sheet URL (can be different workbooks). */
export type BiSpreadsheetTab = { name: string; url: string };

function parseTabsFromEnv(): BiSpreadsheetTab[] | null {
  const raw = process.env.NEXT_PUBLIC_BI_SPREADSHEET_TABS;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: BiSpreadsheetTab[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const name = typeof rec.name === "string" ? rec.name.trim() : "";
      const url = typeof rec.url === "string" ? rec.url.trim() : "";
      if (name && url) out.push({ name, url });
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Tab list for the viewer. Priority: `NEXT_PUBLIC_BI_SPREADSHEET_TABS` JSON → {@link BI_SPREADSHEET_TAB_DEFS}
 * (non-empty URLs) → single tab from `fallbackUrl`.
 */
export function getResolvedGoogleTabs(fallbackUrl: string): BiSpreadsheetTab[] {
  const fromEnv = parseTabsFromEnv();
  if (fromEnv?.length) return fromEnv;

  const fromConfig = BI_SPREADSHEET_TAB_DEFS.filter((t) => t.url.trim());
  if (fromConfig.length > 0) return fromConfig;

  const f = fallbackUrl.trim();
  if (f) return [{ name: "Spreadsheet", url: f }];
  return [];
}

export function tabsStorageKey(tabs: BiSpreadsheetTab[]): string {
  return tabs.map((t) => t.url).join("|");
}

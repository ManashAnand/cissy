/** Google Sheets iframe embed helpers for {@link BiSpreadsheetPane}. */

export function extractSpreadsheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m?.[1] ?? null;
}

export function extractGid(url: string): string | null {
  try {
    const u = new URL(url);
    const gid = u.searchParams.get("gid");
    if (gid) return gid;
    const hash = u.hash;
    const hm = hash.match(/gid=(\d+)/);
    if (hm) return hm[1];
  } catch {
    /* ignore */
  }
  return null;
}

export function buildGoogleSheetEditUrl(spreadsheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=${gid}`;
}

export function toEmbedSrc(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.hostname.includes("docs.google.com") && u.pathname.includes("/spreadsheets")) {
      if (!u.searchParams.has("widget")) u.searchParams.set("widget", "true");
      if (!u.searchParams.has("headers")) u.searchParams.set("headers", "false");
      return u.toString();
    }
    return raw;
  } catch {
    return raw;
  }
}

export function isGoogleSpreadsheetUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes("docs.google.com") && u.pathname.includes("/spreadsheets");
  } catch {
    return false;
  }
}

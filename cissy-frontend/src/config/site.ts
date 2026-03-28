/**
 * App metadata and public URLs. No auth routes — BI app talks to FastAPI + DuckDB.
 */
export const siteConfig = {
  name: "Conversational BI",
  description: "Conversational analytics on your Instacart-style dataset.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

/**
 * Public API helpers for the FastAPI + DuckDB backend (replaces a Supabase client).
 */
export {
  apiFetch,
  postQuery,
  getHealth,
  getConversations,
  postConversation,
  deleteConversation,
} from "@/services/api";

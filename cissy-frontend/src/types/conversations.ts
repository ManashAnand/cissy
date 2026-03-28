/**
 * Aligns with GET/POST /conversations in docs/backend-changes.md
 * (base URL should include /api/v1, e.g. NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1).
 */
export type ConversationSummary = {
  job_id: string;
  label: string | null;
  updated_at: string;
  created_at: string;
};

export type ConversationsListResponse = {
  conversations: ConversationSummary[];
};

export type CreateConversationResponse = {
  job_id: string;
  label?: string | null;
  created_at?: string;
};

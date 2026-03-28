import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { QueryResponse } from "@/types/api";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  /** Assistant: generated SQL (rendered in a dedicated SQL block in the UI). */
  sql?: string;
};

type ConversationState = {
  conversationId: string | null;
  messages: ChatMessage[];
  /** Latest `/query` result (table + chart); survives floating ↔ docked remounts of `ChatShell`. */
  lastQueryResult: QueryResponse | null;
};

const initialState: ConversationState = {
  conversationId: null,
  messages: [],
  lastQueryResult: null,
};

const conversationSlice = createSlice({
  name: "conversation",
  initialState,
  reducers: {
    setConversationId(state, action: PayloadAction<string | null>) {
      state.conversationId = action.payload;
    },
    addMessage(state, action: PayloadAction<ChatMessage>) {
      state.messages.push(action.payload);
    },
    setLastQueryResult(state, action: PayloadAction<QueryResponse | null>) {
      state.lastQueryResult = action.payload;
    },
    clearMessages(state) {
      state.messages = [];
      state.conversationId = null;
      state.lastQueryResult = null;
    },
    /** Clear chat bubbles only; keep `conversationId` (e.g. on `/bi/[jobId]`). */
    clearThreadMessages(state) {
      state.messages = [];
      state.lastQueryResult = null;
    },
  },
});

export const {
  setConversationId,
  addMessage,
  setLastQueryResult,
  clearMessages,
  clearThreadMessages,
} = conversationSlice.actions;
export default conversationSlice.reducer;

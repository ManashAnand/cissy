import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

type ConversationState = {
  conversationId: string | null;
  messages: ChatMessage[];
};

const initialState: ConversationState = {
  conversationId: null,
  messages: [],
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
    clearMessages(state) {
      state.messages = [];
      state.conversationId = null;
    },
    /** Clear chat bubbles only; keep `conversationId` (e.g. on `/bi/[jobId]`). */
    clearThreadMessages(state) {
      state.messages = [];
    },
  },
});

export const {
  setConversationId,
  addMessage,
  clearMessages,
  clearThreadMessages,
} = conversationSlice.actions;
export default conversationSlice.reducer;

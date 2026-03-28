import { configureStore } from "@reduxjs/toolkit";
import conversationReducer from "@/redux/features/conversationSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      conversation: conversationReducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

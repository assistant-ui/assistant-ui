import type { StoreApi, UseBoundStore } from "zustand";
import type { ThreadMessage } from "./AssistantTypes";

export type ContentPartState = {
  isLoading: boolean;
  part: ThreadMessage["content"][number];
};

export type ContentPartStore = {
  useContentPart: UseBoundStore<StoreApi<ContentPartState>>;
};

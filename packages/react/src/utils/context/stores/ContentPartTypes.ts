import type { StoreApi, UseBoundStore } from "zustand";
import type { ThreadMessage } from "./AssistantTypes";

export type ContentPartState = {
  part: ThreadMessage["content"][number];
};

export type ContentPartStore = {
  useContentPart: UseBoundStore<StoreApi<ContentPartState>>;
};

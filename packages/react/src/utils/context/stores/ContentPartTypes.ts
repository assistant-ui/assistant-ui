import type { StoreApi, UseBoundStore } from "zustand";
import type { ThreadMessage } from "./AssistantTypes";

export type ContentPartState = Readonly<{
  status: "in_progress" | "done" | "error";
  part: ThreadMessage["content"][number];
}>;

export type ContentPartStore = {
  useContentPart: UseBoundStore<StoreApi<ContentPartState>>;
};

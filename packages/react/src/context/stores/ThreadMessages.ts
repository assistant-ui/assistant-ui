import { create } from "zustand";
import type { ThreadMessage } from "../../types/AssistantTypes";
import { ReadonlyStore } from "../ReadonlyStore";
import { ThreadRuntime } from "../../api";

export type ThreadMessagesState = readonly ThreadMessage[];

export const makeThreadMessagesStore = (
  runtimeRef: ReadonlyStore<ThreadRuntime>,
) => {
  return create<ThreadMessagesState>(() => runtimeRef.getState().messages);
};

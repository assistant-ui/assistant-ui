import { create } from "zustand";
import type { ThreadMessage } from "../../types/AssistantTypes";
import { ReadonlyStore } from "../ReadonlyStore";
import { ThreadRuntimeStore } from "./ThreadRuntime";

export type ThreadMessagesState = readonly ThreadMessage[];

export const makeThreadMessagesStore = (
  runtimeRef: ReadonlyStore<ThreadRuntimeStore>,
) => {
  return create<ThreadMessagesState>(() => runtimeRef.getState().messages);
};

import type { MutableRefObject } from "react";
import { create } from "zustand";
import type { ThreadMessage } from "../../types/AssistantTypes";
import { ThreadRuntime } from "../../runtimes";

export type ThreadMessagesState = readonly ThreadMessage[];

export const makeThreadMessagesStore = (
  runtimeRef: MutableRefObject<ThreadRuntime>,
) => {
  return create<ThreadMessagesState>(() => runtimeRef.current.messages);
};

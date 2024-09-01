import { create } from "zustand";
import { ReadonlyStore } from "../ReadonlyStore";
import { ThreadRuntimeStore } from "./ThreadRuntime";

export type ThreadState = Readonly<{
  capabilities: Readonly<RuntimeCapabilities>;
  isRunning: boolean;
  isDisabled: boolean;
}>;

export type RuntimeCapabilities = {
  switchToBranch: boolean;
  edit: boolean;
  reload: boolean;
  cancel: boolean;
  unstable_copy: boolean;
};

export const getThreadStateFromRuntime = (
  runtime: ThreadRuntimeStore,
): ThreadState => {
  const lastMessage = runtime.messages.at(-1);
  return Object.freeze({
    capabilities: runtime.capabilities,
    isDisabled: runtime.isDisabled,
    isRunning:
      lastMessage?.role !== "assistant"
        ? false
        : lastMessage.status.type === "running",
  });
};

export const makeThreadStore = (
  runtimeRef: ReadonlyStore<ThreadRuntimeStore>,
) => {
  const runtime = runtimeRef.getState();
  return create<ThreadState>(() => getThreadStateFromRuntime(runtime));
};

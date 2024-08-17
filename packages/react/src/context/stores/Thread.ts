import { create } from "zustand";
import { ReadonlyStore } from "../ReadonlyStore";
import { ThreadRuntimeStore } from "./ThreadRuntime";

export type ThreadState = Readonly<{
  isRunning: boolean;
  isDisabled: boolean;
}>;

export const getThreadStateFromRuntime = (
  runtime: ThreadRuntimeStore,
): ThreadState => {
  const lastMessage = runtime.messages.at(-1);
  if (lastMessage?.role !== "assistant")
    return Object.freeze({
      isDisabled: runtime.isDisabled,
      isRunning: false,
    });
  return Object.freeze({
    isDisabled: runtime.isDisabled,
    isRunning: lastMessage.status.type === "running",
  });
};

export const makeThreadStore = (
  runtimeRef: ReadonlyStore<ThreadRuntimeStore>,
) => {
  const runtime = runtimeRef.getState();
  return create<ThreadState>(() => getThreadStateFromRuntime(runtime));
};

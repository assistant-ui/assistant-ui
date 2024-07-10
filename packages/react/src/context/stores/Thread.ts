import type { MutableRefObject } from "react";
import { create } from "zustand";
import { ThreadRuntime } from "../../runtimes";

export type ThreadState = Readonly<{
  isRunning: boolean;
}>;

export const makeThreadStore = (
  runtimeRef: MutableRefObject<ThreadRuntime>,
) => {
  return create<ThreadState>(() => ({
    isRunning: runtimeRef.current.isRunning,
  }));
};

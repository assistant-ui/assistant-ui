import { create } from "zustand";
import { ReadonlyStore } from "../ReadonlyStore";
import { ThreadRuntimeStore } from "./ThreadRuntime";

export type ThreadState = Readonly<{
  isRunning: boolean;
  isDisabled: boolean;
}>;

export const makeThreadStore = (
  runtimeRef: ReadonlyStore<ThreadRuntimeStore>,
) => {
  return create<ThreadState>(() => ({
    isDisabled: runtimeRef.getState().isDisabled,
    isRunning: runtimeRef.getState().isRunning,
  }));
};

import { create } from "zustand";
import { ReadonlyStore } from "../ReadonlyStore";
import { ThreadRuntimeStore } from "./ThreadRuntime";

export type ThreadState = Readonly<{
  isRunning: boolean;
}>;

export const makeThreadStore = (
  runtimeRef: ReadonlyStore<ThreadRuntimeStore>,
) => {
  return create<ThreadState>(() => ({
    isRunning: runtimeRef.getState().isRunning,
  }));
};

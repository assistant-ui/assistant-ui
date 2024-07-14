import { create } from "zustand";
import { ThreadRuntime } from "../../runtimes";

export type ThreadRuntimeStore = ThreadRuntime;

export const makeThreadRuntimeStore = (runtime: ThreadRuntime) => {
  return create<ThreadRuntimeStore>(() => runtime);
};

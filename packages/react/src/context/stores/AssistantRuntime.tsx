import { create } from "zustand";
import { AssistantRuntime } from "../../runtimes";

export type AssistantRuntimeStore = AssistantRuntime;

export const makeAssistantRuntimeStore = (runtime: AssistantRuntime) => {
  return create<AssistantRuntimeStore>(() => runtime);
};

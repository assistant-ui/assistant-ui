"use client";

import { createContext } from "react";
import type { AssistantToolUIsState } from "../stores/AssistantToolUIs";
import { ReadonlyStore } from "../ReadonlyStore";
import { createContextHook } from "./utils/createContextHook";
import { createContextStoreHook } from "./utils/createContextStoreHook";
import { UseBoundStore } from "zustand";
import { AssistantRuntime } from "../../api/AssistantRuntime";
import { ThreadListRuntime } from "../../api/ThreadListRuntime";
import { createStateHookForRuntime } from "./utils/createStateHookForRuntime";

export type AssistantContextValue = {
  useAssistantRuntime: UseBoundStore<ReadonlyStore<AssistantRuntime>>;
  useToolUIs: UseBoundStore<ReadonlyStore<AssistantToolUIsState>>;
};

export const AssistantContext = createContext<AssistantContextValue | null>(
  null,
);

export const useAssistantContext = createContextHook(
  AssistantContext,
  "AssistantRuntimeProvider",
);

export function useAssistantRuntime(options?: {
  optional?: false | undefined;
}): AssistantRuntime;
export function useAssistantRuntime(options?: {
  optional?: boolean | undefined;
}): AssistantRuntime | null;
export function useAssistantRuntime(options?: {
  optional?: boolean | undefined;
}) {
  const context = useAssistantContext(options);
  if (!context) return null;
  return context.useAssistantRuntime();
}

export const { useToolUIs, useToolUIsStore } = createContextStoreHook(
  useAssistantContext,
  "useToolUIs",
);

const useThreadListRuntime = (opt: {
  optional: boolean | undefined;
}): ThreadListRuntime | null => useAssistantRuntime(opt)?.threads ?? null;
export const useThreadList = createStateHookForRuntime(useThreadListRuntime);

"use client";

import { createContext, useEffect, useState } from "react";
import { ReadonlyStore } from "../ReadonlyStore";
import { UseBoundStore } from "zustand";
import { createContextHook } from "./utils/createContextHook";
import { ThreadRuntime } from "../../api/ThreadRuntime";
import { ModelContext } from "../../model-context";
import { createStateHookForRuntime } from "./utils/createStateHookForRuntime";
import { ThreadComposerRuntime } from "../../api";

export type ThreadContextValue = {
  useThreadRuntime: UseBoundStore<ReadonlyStore<ThreadRuntime>>;
};

export const ThreadContext = createContext<ThreadContextValue | null>(null);

const useThreadContext = createContextHook(
  ThreadContext,
  "AssistantRuntimeProvider",
);

export function useThreadRuntime(options?: {
  optional?: false | undefined;
}): ThreadRuntime;
export function useThreadRuntime(options?: {
  optional?: boolean | undefined;
}): ThreadRuntime | null;
export function useThreadRuntime(options?: { optional?: boolean | undefined }) {
  const context = useThreadContext(options);
  if (!context) return null;
  return context.useThreadRuntime();
}

export const useThread = createStateHookForRuntime(useThreadRuntime);

const useThreadComposerRuntime = (opt: {
  optional: boolean | undefined;
}): ThreadComposerRuntime | null => useThreadRuntime(opt)?.composer ?? null;
export const useThreadComposer = createStateHookForRuntime(
  useThreadComposerRuntime,
);

export function useThreadModelContext(options?: {
  optional?: false | undefined;
}): ModelContext;
export function useThreadModelContext(options?: {
  optional?: boolean | undefined;
}): ModelContext | null;
export function useThreadModelContext(options?: {
  optional?: boolean | undefined;
}): ModelContext | null {
  const [, rerender] = useState({});

  const runtime = useThreadRuntime(options);
  useEffect(() => {
    return runtime?.unstable_on("model-context-update", () => rerender({}));
  }, [runtime]);

  if (!runtime) return null;
  return runtime?.getModelContext();
}

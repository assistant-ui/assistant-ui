"use client";

import { createContext, useEffect, useState } from "react";
import type { ThreadViewportState } from "../stores/ThreadViewport";
import { ReadonlyStore } from "../ReadonlyStore";
import { UseBoundStore } from "zustand";
import { createContextHook } from "./utils/createContextHook";
import { createContextStoreHook } from "./utils/createContextStoreHook";
import { ThreadRuntime } from "../../api/ThreadRuntime";
import { ThreadState } from "../../api/ThreadRuntime";
import { ModelConfig } from "../../types";
import { ThreadComposerState } from "../../api/ComposerRuntime";

export type ThreadContextValue = {
  useThread: UseBoundStore<ReadonlyStore<ThreadState>>;
  useThreadRuntime: UseBoundStore<ReadonlyStore<ThreadRuntime>>;
  useComposer: UseBoundStore<ReadonlyStore<ThreadComposerState>>;
  useViewport: UseBoundStore<ReadonlyStore<ThreadViewportState>>;
};

export const ThreadContext = createContext<ThreadContextValue | null>(null);

export const useThreadContext = createContextHook(
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

export const { useThread } = createContextStoreHook(
  useThreadContext,
  "useThread",
);

export const { useComposer: useThreadComposer } = createContextStoreHook(
  useThreadContext,
  "useComposer",
);

export const {
  useViewport: useThreadViewport,
  useViewportStore: useThreadViewportStore,
} = createContextStoreHook(useThreadContext, "useViewport");

export function useThreadModelConfig(options?: {
  optional?: false | undefined;
}): ModelConfig;
export function useThreadModelConfig(options?: {
  optional?: boolean | undefined;
}): ModelConfig | null;
export function useThreadModelConfig(options?: {
  optional?: boolean | undefined;
}): ModelConfig | null {
  const [, rerender] = useState({});

  const runtime = useThreadRuntime(options);
  useEffect(() => {
    return runtime?.unstable_on("model-config-update", () => rerender({}));
  }, [runtime]);

  if (!runtime) return null;
  return runtime?.getModelConfig();
}

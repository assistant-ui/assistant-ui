"use client";

import { createContext } from "react";
import type { ThreadComposerState } from "../stores/ThreadComposer";
import type { ThreadState } from "../stores/Thread";
import type { ThreadViewportState } from "../stores/ThreadViewport";
import { ThreadActionsState } from "../stores/ThreadActions";
import { ReadonlyStore } from "../ReadonlyStore";
import { ThreadMessagesState } from "../stores/ThreadMessages";
import { ThreadRuntimeStore } from "../stores/ThreadRuntime";
import { UseBoundStore } from "zustand";
import { createContextHook } from "./utils/createContextHook";
import { createContextStoreHook } from "./utils/createContextStoreHook";

export type ThreadContextValue = {
  useThread: UseBoundStore<ReadonlyStore<ThreadState>>;
  useThreadRuntime: UseBoundStore<ReadonlyStore<ThreadRuntimeStore>>;
  useThreadMessages: UseBoundStore<ReadonlyStore<ThreadMessagesState>>;
  useThreadActions: UseBoundStore<ReadonlyStore<ThreadActionsState>>;
  useComposer: UseBoundStore<ReadonlyStore<ThreadComposerState>>;
  useViewport: UseBoundStore<ReadonlyStore<ThreadViewportState>>;
};

export const ThreadContext = createContext<ThreadContextValue | null>(null);

export const useThreadContext = createContextHook(
  ThreadContext,
  "AssistantRuntimeProvider",
);

export const { useThreadRuntime, useThreadRuntimeStore } =
  createContextStoreHook(useThreadContext, "useThreadRuntime");

export const { useThread, useThreadStore } = createContextStoreHook(
  useThreadContext,
  "useThread",
);

export const { useThreadMessages, useThreadMessagesStore } =
  createContextStoreHook(useThreadContext, "useThreadMessages");

export const { useThreadActions, useThreadActionsStore } =
  createContextStoreHook(useThreadContext, "useThreadActions");

export const {
  useComposer: useThreadComposer,
  useComposerStore: useThreadComposerStore,
} = createContextStoreHook(useThreadContext, "useComposer");

export const {
  useViewport: useThreadViewport,
  useViewportStore: useThreadViewportStore,
} = createContextStoreHook(useThreadContext, "useViewport");

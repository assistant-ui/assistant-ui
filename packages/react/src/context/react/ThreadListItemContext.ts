"use client";

import { createContext } from "react";
import { ReadonlyStore } from "../ReadonlyStore";
import { createContextStoreHook } from "./utils/createContextStoreHook";
import { createContextHook } from "./utils/createContextHook";
import { UseBoundStore } from "zustand";
import { ThreadListItemRuntime } from "../../api/ThreadListItemRuntime";
import { ThreadListItemState } from "../../api/ThreadListItemRuntime";

export type ThreadListItemContextValue = {
  useThreadListItemRuntime: UseBoundStore<ReadonlyStore<ThreadListItemRuntime>>;
  useThreadListItem: UseBoundStore<ReadonlyStore<ThreadListItemState>>;
};

export const ThreadListItemContext =
  createContext<ThreadListItemContextValue | null>(null);

export const useThreadListItemContext = createContextHook(
  ThreadListItemContext,
  "a component passed to <ThreadListPrimitive.Items components={...}>",
);

export function useThreadListItemRuntime(options?: {
  optional?: false | undefined;
}): ThreadListItemRuntime;
export function useThreadListItemRuntime(options?: {
  optional?: boolean | undefined;
}): ThreadListItemRuntime | null;
export function useThreadListItemRuntime(options?: {
  optional?: boolean | undefined;
}) {
  const context = useThreadListItemContext(options);
  if (!context) return null;
  return context.useThreadListItemRuntime();
}

export const { useThreadListItem } = createContextStoreHook(
  useThreadListItemContext,
  "useThreadListItem",
);

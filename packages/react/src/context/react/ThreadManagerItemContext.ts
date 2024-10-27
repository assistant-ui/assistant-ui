"use client";

import { createContext } from "react";
import { ReadonlyStore } from "../ReadonlyStore";
import { createContextStoreHook } from "./utils/createContextStoreHook";
import { createContextHook } from "./utils/createContextHook";
import { UseBoundStore } from "zustand";
import { ThreadManagerItemRuntime } from "../../api/ThreadManagerItemRuntime";
import { ThreadManagerItemState } from "../../api/ThreadManagerItemRuntime";

export type ThreadManagerItemContextValue = {
  useThreadManagerItemRuntime: UseBoundStore<
    ReadonlyStore<ThreadManagerItemRuntime>
  >;
  useThreadManagerItem: UseBoundStore<ReadonlyStore<ThreadManagerItemState>>;
};

export const ThreadManagerItemContext =
  createContext<ThreadManagerItemContextValue | null>(null);

export const useThreadManagerItemContext = createContextHook(
  ThreadManagerItemContext,
  "a component passed to <ThreadManagerPrimitive.Items components={...}>",
);

export function useThreadManagerItemRuntime(options?: {
  optional?: false | undefined;
}): ThreadManagerItemRuntime;
export function useThreadManagerItemRuntime(options?: {
  optional?: boolean | undefined;
}): ThreadManagerItemRuntime | null;
export function useThreadManagerItemRuntime(options?: {
  optional?: boolean | undefined;
}) {
  const context = useThreadManagerItemContext(options);
  if (!context) return null;
  return context.useThreadManagerItemRuntime();
}

export const { useThreadManagerItem, useThreadManagerItemStore } =
  createContextStoreHook(useThreadManagerItemContext, "useThreadManagerItem");

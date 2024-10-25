"use client";

import { createContext } from "react";
import { ReadonlyStore } from "../ReadonlyStore";
import { createContextStoreHook } from "./utils/createContextStoreHook";
import { createContextHook } from "./utils/createContextHook";
import { UseBoundStore } from "zustand";
import { ContentPartRuntime } from "../../api/ContentPartRuntime";
import { ContentPartState } from "../../api/ContentPartRuntime";

export type ContentPartContextValue = {
  useContentPartRuntime: UseBoundStore<ReadonlyStore<ContentPartRuntime>>;
  useContentPart: UseBoundStore<ReadonlyStore<ContentPartState>>;
};

export const ContentPartContext = createContext<ContentPartContextValue | null>(
  null,
);

export const useContentPartContext = createContextHook(
  ContentPartContext,
  "a component passed to <MessagePrimitive.Content components={...}>",
);

export function useContentPartRuntime(options?: {
  optional?: false | undefined;
}): ContentPartRuntime;
export function useContentPartRuntime(options?: {
  optional?: boolean | undefined;
}): ContentPartRuntime | null;
export function useContentPartRuntime(options?: {
  optional?: boolean | undefined;
}) {
  const context = useContentPartContext(options);
  if (!context) return null;
  return context.useContentPartRuntime();
}

export const { useContentPart, useContentPartStore } = createContextStoreHook(
  useContentPartContext,
  "useContentPart",
);

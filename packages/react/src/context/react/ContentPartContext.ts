"use client";

import { createContext } from "react";
import type { ContentPartState } from "../stores/ContentPart";
import { ReadonlyStore } from "../ReadonlyStore";
import { createContextStoreHook } from "./utils/createContextStoreHook";
import { createContextHook } from "./utils/createContextHook";
import { UseBoundStore } from "zustand";

export type ContentPartContextValue = {
  useContentPart: UseBoundStore<ReadonlyStore<ContentPartState>>;
};

export const ContentPartContext = createContext<ContentPartContextValue | null>(
  null,
);

export const useContentPartContext = createContextHook(
  ContentPartContext,
  "a component passed to <MessagePrimitive.Content components={...}>",
);

export const { useContentPart, useContentPartStore } = createContextStoreHook(
  useContentPartContext,
  "useContentPart",
);

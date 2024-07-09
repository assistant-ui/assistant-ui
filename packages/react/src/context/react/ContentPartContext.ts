"use client";

import { createContext, useContext } from "react";
import type { ContentPartState } from "../stores/ContentPart";
import { ReadonlyStore } from "../ReadonlyStore";

export type ContentPartContextValue = {
  useContentPart: ReadonlyStore<ContentPartState>;
};

export const ContentPartContext = createContext<ContentPartContextValue | null>(
  null,
);

export function useContentPartContext(): ContentPartContextValue;
export function useContentPartContext(options: {
  optional: true;
}): ContentPartContextValue | null;
export function useContentPartContext(options?: { optional: true }) {
  const context = useContext(ContentPartContext);
  if (!options?.optional && !context)
    throw new Error(
      "This component can only be used inside a component passed to <MessagePrimitive.Content components={...} >.",
    );
  return context;
}

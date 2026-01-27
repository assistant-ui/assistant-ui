"use client";

import type { Element } from "hast";
import {
  type ComponentPropsWithoutRef,
  createContext,
  memo,
  useContext,
} from "react";
import { memoCompareNodes } from "../memoization";

type PreOverrideProps = ComponentPropsWithoutRef<"pre"> & {
  node?: Element | undefined;
};

/**
 * Context that indicates we're inside a <pre> element (code block).
 * Used by code adapter to distinguish inline code from block code.
 */
export const PreContext = createContext<PreOverrideProps | null>(null);

/**
 * Hook to check if the current code element is inside a code block.
 * Returns true if inside a <pre> (code block), false if inline code.
 */
export function useIsStreamdownCodeBlock(): boolean {
  return useContext(PreContext) !== null;
}

/**
 * Hook to get the pre element props when inside a code block.
 * Returns null if not inside a code block.
 */
export function useStreamdownPreProps(): PreOverrideProps | null {
  return useContext(PreContext);
}

/**
 * Pre component override that provides context for child code elements.
 * This enables reliable inline vs block code detection.
 */
export const PreOverride = memo(function PreOverride({
  children,
  node,
  ...rest
}: PreOverrideProps) {
  return (
    <PreContext.Provider value={{ node, ...rest }}>
      <pre {...rest}>{children}</pre>
    </PreContext.Provider>
  );
}, memoCompareNodes);

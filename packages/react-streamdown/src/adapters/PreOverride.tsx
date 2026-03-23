"use client";

import type { Element } from "hast";
import {
  type ComponentPropsWithoutRef,
  type ReactElement,
  cloneElement,
  createContext,
  isValidElement,
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

export const PreOverride = memo(function PreOverride({
  children,
  node,
  ...rest
}: PreOverrideProps) {
  const childWithBlock = isValidElement(children)
    ? cloneElement(children as ReactElement<{ "data-block"?: string }>, {
        "data-block": "true",
      })
    : children;

  return (
    <PreContext.Provider value={{ node, ...rest }}>
      <pre {...rest}>{childWithBlock}</pre>
    </PreContext.Provider>
  );
}, memoCompareNodes);

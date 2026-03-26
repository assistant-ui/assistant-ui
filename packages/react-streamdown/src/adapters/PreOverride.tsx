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
 * Stores the original pre props for descendants inside a block code fence.
 * Streamdown itself uses a data-block marker for block detection, but we keep
 * this context for compatibility and access to pre metadata.
 */
export const PreContext = createContext<PreOverrideProps | null>(null);

/**
 * Hook to check if the current element is rendered within a block code fence.
 */
export function useIsStreamdownCodeBlock(): boolean {
  return useContext(PreContext) !== null;
}

/**
 * Hook to get the original pre element props for the current block code fence.
 * Returns null if not inside a code block.
 */
export function useStreamdownPreProps(): PreOverrideProps | null {
  return useContext(PreContext);
}

/**
 * Mirrors streamdown's pre override by marking the child code element as block
 * content without adding an extra <pre> wrapper around it.
 */
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
      {childWithBlock}
    </PreContext.Provider>
  );
}, memoCompareNodes);

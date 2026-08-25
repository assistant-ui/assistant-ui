"use client";

import type { Element } from "hast";
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  cloneElement,
  createContext,
  isValidElement,
  memo,
  useContext,
} from "react";
import { memoCompareNodes } from "../memoization";

type CodeChildProps = {
  "data-block"?: string;
  node?: Element;
  children?: ReactNode;
};

function fencedCodeText(children: ReactNode): string | undefined {
  if (!isValidElement<CodeChildProps>(children)) return undefined;
  const inner = children.props.children;
  if (typeof inner === "string") return inner;
  if (typeof inner === "number") return String(inner);
  return undefined;
}

function hashText(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (Math.imul(31, hash) + text.charCodeAt(i)) | 0;
  }
  return (hash >>> 0) + 1;
}

function nodeWithContent(node: Element, text: string): Element {
  const end = node.position?.end;
  if (!node.position || !end) return node;
  return {
    ...node,
    position: {
      ...node.position,
      end: { ...end, column: hashText(text) },
    },
  };
}

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
  const text = fencedCodeText(children);
  const childWithBlock = isValidElement<CodeChildProps>(children)
    ? cloneElement(children, {
        "data-block": "true",
        ...(text !== undefined && children.props.node
          ? { node: nodeWithContent(children.props.node, text) }
          : {}),
      })
    : children;

  return (
    <PreContext.Provider value={{ node, ...rest }}>
      {childWithBlock}
    </PreContext.Provider>
  );
}, memoCompareNodes);

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
  useState,
} from "react";
import { memoCompareNodes } from "../memoization";

type PreOverrideProps = ComponentPropsWithoutRef<"pre"> & {
  node?: Element | undefined;
};

const useCodeRevision = (children: ReactNode) => {
  const childContent = isValidElement<{ children?: ReactNode }>(children)
    ? children.props.children
    : null;
  const content =
    typeof childContent === "string" || typeof childContent === "number"
      ? String(childContent).replace(/\n$/, "")
      : null;
  const [state, setState] = useState(() => ({
    anchor: content,
    revision: 0,
  }));

  if (content === null || content === state.anchor) {
    return state.revision;
  }

  if (state.anchor === null || content.startsWith(state.anchor)) {
    setState({ anchor: content, revision: state.revision });
    return state.revision;
  }

  const nextRevision = state.revision + 1;
  setState({ anchor: content, revision: nextRevision });
  return nextRevision;
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
  const codeRevision = useCodeRevision(children);
  const childWithBlock = isValidElement<{
    "data-block"?: string;
    children?: ReactNode;
  }>(children)
    ? cloneElement(children, {
        "data-block": "true",
        key: `${children.key ?? "code"}:${codeRevision}`,
      })
    : children;

  return (
    <PreContext.Provider value={{ node, ...rest }}>
      {childWithBlock}
    </PreContext.Provider>
  );
}, memoCompareNodes);

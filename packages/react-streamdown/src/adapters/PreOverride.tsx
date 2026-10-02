"use client";

import type { Element } from "hast";
import {
  type ComponentPropsWithoutRef,
  type ComponentType,
  type ReactElement,
  cloneElement,
  createContext,
  isValidElement,
  memo,
  useContext,
  useRef,
} from "react";
import {
  isEqualToDepth,
  isSameHastNode,
  memoCompareNodes,
} from "../memoization";

export type PreOverrideProps = ComponentPropsWithoutRef<"pre"> & {
  node?: Element | undefined;
};

export type PreComponent = ComponentType<PreOverrideProps>;

function isSamePreProps(prev: PreOverrideProps, next: PreOverrideProps) {
  const { node: prevNode, ...prevRest } = prev;
  const { node: nextNode, ...nextRest } = next;
  return (
    isSameHastNode(prevNode, nextNode) && isEqualToDepth(prevRest, nextRest, 2)
  );
}

export function DefaultPre({ node: _, ...props }: PreOverrideProps) {
  return <pre {...props} />;
}

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
 * content without adding an extra <pre> wrapper around it. A pre without a code
 * child (raw HTML) has no code component to re-emit its element, so it renders
 * through the fallback pre instead of losing the element. Streamdown re-parses a
 * block whenever it re-renders, so the context value keeps its identity while
 * the pre props are equal by value, and its consumers skip unchanged fences.
 */
export const PreOverride = memo(
  function PreOverride({
    children,
    node,
    fallbackPre: FallbackPre = DefaultPre,
    ...rest
  }: PreOverrideProps & { fallbackPre?: PreComponent | undefined }) {
    const preProps = useRef<PreOverrideProps | null>(null);

    const hasCodeChild =
      node?.children.some(
        (child) => child.type === "element" && child.tagName === "code",
      ) ?? true;

    if (!hasCodeChild) {
      return (
        <FallbackPre node={node} {...rest}>
          {children}
        </FallbackPre>
      );
    }

    const nextPreProps = { node, ...rest };
    if (
      preProps.current === null ||
      !isSamePreProps(preProps.current, nextPreProps)
    ) {
      preProps.current = nextPreProps;
    }

    const childWithBlock = isValidElement(children)
      ? cloneElement(children as ReactElement<{ "data-block"?: string }>, {
          "data-block": "true",
        })
      : children;

    return (
      <PreContext.Provider value={preProps.current}>
        {childWithBlock}
      </PreContext.Provider>
    );
  },
  (prev, next) =>
    prev.fallbackPre === next.fallbackPre && memoCompareNodes(prev, next),
);

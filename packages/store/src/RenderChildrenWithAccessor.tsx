"use client";

import { type ReactNode, useMemo, useRef } from "react";
import type { AssistantClient } from "./types/client";
import { useAuiState } from "./useAuiState";
import { useAui } from "./useAui";

export const useGetItemAccessor = <T,>(
  getItemState: (aui: AssistantClient) => T,
) => {
  const aui = useAui();

  // Track access with a dedicated flag:
  // useSyncExternalStore may call getSnapshot() after commit (tearing checks),
  // which would re-cache the current state and mask later real updates.
  // Use the current state as the pre-access snapshot so the post-commit check
  // matches getItemState(aui) and doesn't schedule an unnecessary re-render.
  const accessedRef = useRef(false);
  const currentValue = accessedRef.current ? null : getItemState(aui);
  useAuiState(() => {
    if (!accessedRef.current) return currentValue;
    return getItemState(aui);
  });

  return () => {
    accessedRef.current = true;
    return getItemState(aui);
  };
};

const EMPTY_OBJECT = Object.freeze({});

/**
 * Component that sets up a lazy item accessor and memoizes propless children.
 *
 * For the common pattern where children returns a component without props
 * (e.g. `<Foo />`), the output is memoized and not re-created on parent re-renders.
 *
 * @example
 * ```tsx
 * <RenderChildrenWithAccessor
 *   getItemState={(aui) => aui.fooList().foo({ index }).getState()}
 * >
 *   {() => <Foo />}
 * </RenderChildrenWithAccessor>
 * ```
 */
export function RenderChildrenWithAccessor<T>({
  getItemState,
  children,
}: {
  getItemState: (aui: AssistantClient) => T;
  children: (getItem: () => T) => ReactNode;
}): ReactNode {
  const getItem = useGetItemAccessor(getItemState);
  return useMemoizedProplessComponent(children(getItem));
}

const useMemoizedProplessComponent = (node: ReactNode) => {
  const el =
    typeof node === "object" && node != null && "type" in node ? node : null;
  const resultType = el?.type;
  const resultKey = el?.key;
  const resultProps =
    typeof el?.props === "object" &&
    el.props != null &&
    Object.entries(el.props).length === 0
      ? EMPTY_OBJECT
      : el?.props;

  return (
    // biome-ignore lint/correctness/useExhaustiveDependencies: optimization
    useMemo(() => el, [resultType, resultKey, resultProps]) ?? node
  );
};

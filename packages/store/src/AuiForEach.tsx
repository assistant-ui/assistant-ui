"use client";

import { Fragment, type ReactNode, useMemo, useRef } from "react";
import type { AssistantClient, AssistantState } from "./types/client";
import { useAuiState } from "./useAuiState";
import { useAui } from "./useAui";

/**
 * Component that iterates over a list of items with key-stable rendering.
 *
 * Only re-renders when the key list changes (items added/removed/reordered),
 * NOT when individual item data changes.
 *
 * @example
 * ```tsx
 * <AuiForEach
 *   keys={(s) => s.fooList.foos.map(f => f.id)}
 * >
 *   {(itemKey, index) => (
 *     <FooProvider index={index}>
 *       <Foo />
 *     </FooProvider>
 *   )}
 * </AuiForEach>
 * ```
 */
export function AuiForEach<TKey extends string | number>({
  keys: keysSelector,
  children,
}: {
  keys: (state: AssistantState) => readonly TKey[];
  children: (itemKey: TKey, index: number) => ReactNode;
}): ReactNode {
  const arr = useAuiState(keysSelector);

  return useMemo(
    () =>
      arr.map((key, index) => (
        <Fragment key={key}>{children(key, index)}</Fragment>
      )),
    // biome-ignore lint/correctness/useExhaustiveDependencies: shallow memo
    arr,
  );
}

export const useGetItemAccessor = <T,>(
  getItemState: (aui: AssistantClient) => T,
) => {
  const aui = useAui();

  // if the consumer never accesses the item, do not trigger rerenders
  const cacheRef = useRef<T | undefined>(undefined);
  useAuiState(() => {
    if (cacheRef.current === undefined) {
      cacheRef.current = getItemState(aui);
    }
    return cacheRef.current;
  });

  return () => {
    cacheRef.current = undefined; // clear the cache (rerender on next state change)

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

"use client";

import type { ReactNode } from "react";
import type { AssistantState, ClientNames } from "./types/client";
import { useAuiState } from "./useAuiState";
import { useMemoizedProplessComponent } from "./RenderChildrenWithAccessor";

/**
 * Reads one scope's state from context and memoizes propless children, so a
 * `{() => <Foo />}` child is not re-created on parent re-renders.
 */
export function RenderChildrenWithScope<K extends ClientNames>({
  scope,
  children,
}: {
  scope: K;
  children: (getItem: () => AssistantState[K]) => ReactNode;
}): ReactNode {
  const state = useAuiState(scope);
  return useMemoizedProplessComponent(children(() => state));
}

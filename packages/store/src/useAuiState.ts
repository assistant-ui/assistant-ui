import { useSyncExternalStore, useDebugValue, useRef } from "react";
import type { AssistantState } from "./types/client";
import { useAui } from "./useAui";
import { getProxiedAssistantState } from "./utils/proxied-assistant-state";

/**
 * Hook to access a slice of the assistant state with automatic subscription
 *
 * @param selector - Function to select a slice of the state
 * @returns The selected state slice
 *
 * @example
 * ```typescript
 * const aui = useAui({
 *   foo: RootScope({ ... }),
 * });
 *
 * const bar = useAuiState((s) => s.foo.bar);
 * ```
 */
export const useAuiState = <T>(selector: (state: AssistantState) => T): T => {
  const aui = useAui();
  const proxiedState = getProxiedAssistantState(aui);

  // Zombie-child guard: a parent state change (e.g. thread switch, history
  // reload) can shrink an indexed list before React unmounts the children
  // that subscribed to its old indices. Their selectors then read through
  // the proxy into `tapClientLookup.get({ index })` and throw out-of-bounds
  // before unmount runs. Returning the last successful slice keeps React's
  // reconciliation moving so the stale child is unmounted by its parent
  // instead of crashing the tree (matches react-redux's `useSelector`
  // pattern). The first selector call is never suppressed.
  const lastSliceRef = useRef<{ value: T } | null>(null);

  const slice = useSyncExternalStore(
    aui.subscribe,
    () => {
      try {
        const value = selector(proxiedState);
        lastSliceRef.current = { value };
        return value;
      } catch (err) {
        if (lastSliceRef.current === null) throw err;
        return lastSliceRef.current.value;
      }
    },
    () => {
      try {
        const value = selector(proxiedState);
        lastSliceRef.current = { value };
        return value;
      } catch (err) {
        if (lastSliceRef.current === null) throw err;
        return lastSliceRef.current.value;
      }
    },
  );

  if (slice === proxiedState) {
    throw new Error(
      "You tried to return the entire AssistantState. This is not supported due to technical limitations.",
    );
  }

  useDebugValue(slice);

  return slice;
};

import {
  useSyncExternalStore,
  useDebugValue,
  useRef,
  useCallback,
} from "react";
import type { AssistantState } from "./types/client";
import { useAui } from "./useAui";
import { getProxiedAssistantState } from "./utils/proxied-assistant-state";
import { shallow } from "./shallow";

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
 * const bar = useAuiState((state) => state.foo.bar);
 * ```
 */
export const useAuiState = <T,>(selector: (state: AssistantState) => T): T => {
  const aui = useAui();
  const proxiedState = getProxiedAssistantState(aui);

  const slice = useSyncExternalStore(
    aui.subscribe,
    () => selector(proxiedState),
    () => selector(proxiedState),
  );

  if (slice === proxiedState) {
    throw new Error(
      "You tried to return the entire AssistantState. This is not supported due to technical limitations.",
    );
  }

  useDebugValue(slice);

  return slice;
};

/**
 * Hook to access a slice of the assistant state with shallow equality comparison.
 *
 * Use this when your selector returns an object or array. Without shallow comparison,
 * selectors that return new object references on every call will cause infinite
 * re-renders due to useSyncExternalStore's Object.is comparison.
 *
 * @param selector - Function to select a slice of the state (may return objects/arrays)
 * @returns The selected state slice (stable reference if shallowly equal)
 *
 * @example
 * ```typescript
 * // ❌ BAD: useAuiState with object return causes infinite loop
 * const { count, isActive } = useAuiState(({ thread }) => ({
 *   count: thread.messages.length,
 *   isActive: thread.status?.type === "running",
 * }));
 *
 * // ✅ GOOD: useAuiStateShallow handles object returns safely
 * const { count, isActive } = useAuiStateShallow(({ thread }) => ({
 *   count: thread.messages.length,
 *   isActive: thread.status?.type === "running",
 * }));
 * ```
 */
export const useAuiStateShallow = <T,>(
  selector: (state: AssistantState) => T,
): T => {
  const aui = useAui();
  const proxiedState = getProxiedAssistantState(aui);
  const prevRef = useRef<T | undefined>(undefined);

  // Memoize selector to maintain stable reference
  const stableSelector = useCallback(() => {
    const next = selector(proxiedState);
    if (prevRef.current !== undefined && shallow(prevRef.current, next)) {
      return prevRef.current;
    }
    prevRef.current = next;
    return next;
  }, [selector, proxiedState]);

  const slice = useSyncExternalStore(
    aui.subscribe,
    stableSelector,
    stableSelector,
  );

  if (slice === proxiedState) {
    throw new Error(
      "You tried to return the entire AssistantState. This is not supported due to technical limitations.",
    );
  }

  useDebugValue(slice);

  return slice;
};

import {
  useCallback,
  useDebugValue,
  useRef,
  useSyncExternalStore,
} from "react";
import type { AssistantState } from "./types/client";
import { useAui } from "./useAui";
import { getProxiedAssistantState } from "./utils/proxied-assistant-state";
import { InvalidDerivedScopeError } from "./InvalidDerivedScopeError";
import { isClientMethods } from "./tapClientResource";

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
  const prevSliceRef = useRef<{ hasValue: boolean; value: T }>({
    hasValue: false,
    value: undefined as T,
  });

  const getSnapshot = useCallback(() => {
    try {
      const nextValue = selector(proxiedState);
      prevSliceRef.current = { hasValue: true, value: nextValue };
      return nextValue;
    } catch (e) {
      if (
        e instanceof InvalidDerivedScopeError &&
        prevSliceRef.current.hasValue &&
        !isClientMethods(prevSliceRef.current.value)
      ) {
        return prevSliceRef.current.value;
      }
      throw e;
    }
  }, [selector, proxiedState]);

  const slice = useSyncExternalStore(aui.subscribe, getSnapshot, getSnapshot);

  if (slice === proxiedState) {
    throw new Error(
      "You tried to return the entire AssistantState. This is not supported due to technical limitations.",
    );
  }

  useDebugValue(slice);

  return slice;
};

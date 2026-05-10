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
  const lastSnapshot = useRef<{ value: T } | undefined>(undefined);

  const getSnapshot = () => {
    try {
      const value = selector(proxiedState);
      lastSnapshot.current = { value };
      return value;
    } catch (e) {
      if (lastSnapshot.current !== undefined) return lastSnapshot.current.value;
      throw e;
    }
  };

  const slice = useSyncExternalStore(aui.subscribe, getSnapshot, getSnapshot);

  if (slice === proxiedState) {
    throw new Error(
      "You tried to return the entire AssistantState. This is not supported due to technical limitations.",
    );
  }

  useDebugValue(slice);

  return slice;
};

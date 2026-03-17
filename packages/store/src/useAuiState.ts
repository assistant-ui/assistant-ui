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
  const lastValueRef = useRef<{ value: T } | null>(null);

  const slice = useSyncExternalStore(
    aui.subscribe,
    () => {
      try {
        const value = selector(proxiedState);
        lastValueRef.current = { value };
        return value;
      } catch (e) {
        if (lastValueRef.current) {
          return lastValueRef.current.value;
        }
        throw e;
      }
    },
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

import { useSyncExternalStore, useDebugValue } from "react";
import type { AssistantState } from "@assistant-ui/core/store";
import { getProxiedAssistantState } from "@assistant-ui/core/store/internal";
import { useAui } from "./useAui";

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
export const useAuiState = <T>(selector: (state: AssistantState) => T): T => {
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

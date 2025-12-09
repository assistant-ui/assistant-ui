import { useSyncExternalStore, useDebugValue } from "react";
import type { AssistantState } from "./types/client";
import { useAssistantClient } from "./useAssistantClient";
import { getProxiedAssistantState } from "./utils/proxied-assistant-state";

/**
 * Hook to access a slice of the assistant state with automatic subscription
 *
 * @param selector - Function to select a slice of the state
 * @returns The selected state slice
 *
 * @example
 * ```typescript
 * const aui = useAssistantClient({
 *   foo: RootScope({ ... }),
 * });
 *
 * const bar = useAssistantState((state) => state.foo.bar);
 * ```
 */
export const useAssistantState = <T,>(
  selector: (state: AssistantState) => T,
): T => {
  const aui = useAssistantClient();
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

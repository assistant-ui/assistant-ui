import { useSyncExternalStore, useDebugValue } from "react";
import type { AssistantState } from "./types/client";
import { useAui } from "./useAui";
import { getProxiedAssistantState } from "./utils/proxied-assistant-state";

/**
 * Subscribes to a slice of {@link AssistantState} and re-renders the
 * component whenever that slice changes.
 *
 * The `selector` is called on every store update; its return value is
 * compared by `Object.is`, and the component re-renders only when the
 * selected slice changes. Returning the entire state object is not
 * supported and throws at runtime — select a specific field instead, or
 * compose multiple `useAuiState` calls.
 *
 * @param selector - Pure function that derives a value from the current
 *   assistant state. Should be cheap and referentially stable for equal
 *   inputs (plain field reads, primitives, or memoized values).
 * @returns The currently selected slice.
 *
 * @example
 * ```tsx
 * // Disable a button while a run is in flight.
 * const isRunning = useAuiState((s) => s.thread.isRunning);
 * ```
 *
 * @example
 * ```tsx
 * // Prefer multiple selectors over an inline object literal, which would
 * // create a new reference on every render.
 * const text = useAuiState((s) => s.composer.text);
 * const canSend = useAuiState((s) => s.composer.canSend);
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

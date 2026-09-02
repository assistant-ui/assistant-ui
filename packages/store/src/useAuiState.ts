import { useSyncExternalStore, useDebugValue, useMemo } from "react";
import type { AssistantState } from "./types/client";
import { useAui } from "./useAui";
import {
  collectAssistantStateDependencies,
  getProxiedAssistantState,
} from "./utils/proxied-assistant-state";
import { subscribeToClient } from "./useClientResource";
import { useShallowStable } from "./utils/useShallowStable";
import type { ClientMethods } from "./types/client";

/**
 * Subscribes to a slice of {@link AssistantState} and re-renders the
 * component whenever that slice changes.
 *
 * The `selector` is called when a scope it reads updates; its return value
 * is compared by `Object.is`, and the component re-renders only when the
 * selected slice changes. Returning the entire state object is not
 * supported and throws at runtime — select a specific field instead, or
 * compose multiple `useAuiState` calls. Returning a new object or array
 * literal, including spreading `s.thread` into a new object, causes a
 * re-render on every store update; either select primitives or return a
 * memoized reference.
 *
 * Scopes that may be unavailable can be read via `s.optional.<scope>`,
 * which resolves to `undefined` instead of throwing.
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
export const useAuiState = <T>(selector: (state: AssistantState) => T): T =>
  useAuiStateImpl(selector);

const useAuiStateImpl = <T>(
  selector: (state: AssistantState) => T,
  providedDependencies?: readonly ClientMethods[],
): T => {
  const aui = useAui();
  const proxiedState = getProxiedAssistantState(aui);
  const dependencies = useShallowStable(
    providedDependencies ??
      collectAssistantStateDependencies(() => selector(proxiedState))
        .dependencies,
  );
  const subscribe = useMemo(() => {
    return (callback: () => void) => {
      if (dependencies.length === 0) return aui.subscribe(callback);

      const unsubscribers: Array<() => void> = [];
      for (const dependency of dependencies) {
        const unsubscribe = subscribeToClient(dependency, callback);
        if (!unsubscribe) {
          for (const unsubscribeClient of unsubscribers) unsubscribeClient();
          return aui.subscribe(callback);
        }
        unsubscribers.push(unsubscribe);
      }
      return () => {
        for (const unsubscribe of unsubscribers) unsubscribe();
      };
    };
  }, [aui, dependencies]);

  const slice = useSyncExternalStore(
    subscribe,
    () => selector(proxiedState),
    () => selector(proxiedState),
  );

  if (
    typeof slice === "object" &&
    slice !== null &&
    ((slice as unknown) === proxiedState ||
      (slice as unknown) === proxiedState.optional)
  ) {
    throw new Error(
      "You tried to return the entire AssistantState. This is not supported due to technical limitations.",
    );
  }

  useDebugValue(slice);

  return slice;
};

export const useAuiStateWithDependencies = <T>(
  selector: (state: AssistantState) => T,
  dependencies: readonly ClientMethods[] | undefined,
): T => useAuiStateImpl(selector, dependencies);

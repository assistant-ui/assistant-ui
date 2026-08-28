import { useSyncExternalStore, useDebugValue } from "react";
import type { AssistantState, ClientNames } from "./types/client";
import { useAui } from "./useAui";
import { getProxiedAssistantState } from "./utils/proxied-assistant-state";
import {
  SCOPE_STATE_UNSET,
  useScopeStateContext,
} from "./utils/scope-state-context";

export function useAuiState<K extends ClientNames>(scope: K): AssistantState[K];
export function useAuiState<K extends ClientNames, T>(
  scope: K,
  selector: (state: AssistantState[K]) => T,
): T;
/**
 * Subscribes to a slice of {@link AssistantState} and re-renders the
 * component whenever that slice changes.
 *
 * The `selector` is called on every store update; its return value is
 * compared by `Object.is`, and the component re-renders only when the
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
export function useAuiState<T>(selector: (state: AssistantState) => T): T;
export function useAuiState(
  scopeOrSelector: ClientNames | ((state: AssistantState) => unknown),
  scopeSelector?: (state: unknown) => unknown,
): unknown {
  if (typeof scopeOrSelector === "string") {
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- the overload is fixed per call site
    return useScopedAuiState(scopeOrSelector, scopeSelector);
  }
  // oxlint-disable-next-line react-hooks/rules-of-hooks -- the overload is fixed per call site
  return useSelectedAuiState(scopeOrSelector);
}

const useScopedAuiState = (
  scope: ClientNames,
  selector: ((state: unknown) => unknown) | undefined,
): unknown => {
  const state = useScopeStateContext(scope);
  if (state === SCOPE_STATE_UNSET) {
    throw new Error(
      `useAuiState("${scope}"): no AuiProvider above this component publishes the "${scope}" scope.`,
    );
  }
  const slice = selector ? selector(state) : state;
  useDebugValue(slice);
  return slice;
};

const useSelectedAuiState = <T>(selector: (state: AssistantState) => T): T => {
  const aui = useAui();
  const proxiedState = getProxiedAssistantState(aui);

  const slice = useSyncExternalStore(
    aui.subscribe,
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

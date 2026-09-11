import { computed, onScopeDispose, shallowRef, type ComputedRef } from "vue";
import {
  getProxiedAssistantState,
  type AssistantState,
} from "@assistant-ui/store/client";
import { useAuiContext } from "./context";

/**
 * Subscribes to a slice of `AssistantState` and returns it as a computed ref.
 *
 * The `selector` runs on every store update; dependents re-run only when the
 * selected slice changes by `Object.is`. Returning the entire state object is
 * not supported and throws — select a specific field instead, or compose
 * multiple `useAuiState` calls. Returning a fresh object or array literal
 * re-triggers dependents on every update; select primitives or a memoized
 * reference.
 *
 * Scopes that may be unavailable can be read via `s.optional.<scope>`, which
 * resolves to `undefined` instead of throwing.
 *
 * @example
 * ```ts
 * const isRunning = useAuiState((s) => s.thread.isRunning);
 * // template: <button :disabled="isRunning">…</button>
 * ```
 */
export const useAuiState = <T>(
  selector: (state: AssistantState) => T,
): ComputedRef<T> => {
  const { source } = useAuiContext();

  const version = shallowRef(0);
  const unsubscribe = source.subscribe(() => {
    version.value++;
  });
  onScopeDispose(unsubscribe);

  return computed(() => {
    void version.value;
    const state = getProxiedAssistantState(source.getClient());
    const slice = selector(state);

    if (
      typeof slice === "object" &&
      slice !== null &&
      ((slice as unknown) === state || (slice as unknown) === state.optional)
    ) {
      throw new Error(
        "You tried to return the entire AssistantState. This is not supported due to technical limitations.",
      );
    }

    return slice;
  });
};

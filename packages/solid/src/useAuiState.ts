import { createMemo, type Accessor } from "solid-js";
import {
  getProxiedAssistantState,
  type AssistantState,
} from "@assistant-ui/store/client";
import { useAuiContext } from "./context";

/**
 * Subscribes to a slice of `AssistantState` and returns it as an accessor.
 *
 * The `selector` runs on every store update and whenever a signal it reads
 * changes; dependents re-run only when the selected slice changes by
 * `Object.is`. Returning the entire state object is not supported and
 * throws. Select a specific field instead, or compose multiple `useAuiState`
 * calls. Returning a fresh object or array literal re-triggers dependents on
 * every update; select primitives or a memoized reference.
 *
 * Scopes that may be unavailable can be read via `s.optional.<scope>`, which
 * resolves to `undefined` instead of throwing.
 *
 * Call it under a reactive owner, such as a component body; the accessor
 * stops recomputing when that owner is disposed.
 *
 * @example
 * ```tsx
 * const isRunning = useAuiState((s) => s.thread.isRunning);
 * <button disabled={isRunning()}>…</button>
 * ```
 */
export const useAuiState = <T>(
  selector: (state: AssistantState) => T,
): Accessor<T> => {
  const { source, track } = useAuiContext();

  return createMemo(
    () => {
      track();
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
    },
    undefined,
    { equals: Object.is },
  );
};

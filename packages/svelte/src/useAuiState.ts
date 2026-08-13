import { createSubscriber } from "svelte/reactivity";
import {
  getProxiedAssistantState,
  type AssistantState,
} from "@assistant-ui/store/client";
import { getAuiContext } from "./context";

/**
 * Subscribes to a slice of `AssistantState` and returns it behind a reactive
 * `current` getter. Call during component initialization.
 *
 * Reading `current` inside an effect or template tracks the store: the read
 * re-runs after every store update. The `selector` runs on each read;
 * returning the entire state object is not supported and throws. Select a
 * specific field instead, or compose multiple `useAuiState` calls. Wrap the
 * read in `$derived` to deduplicate downstream updates by value.
 *
 * Scopes that may be unavailable can be read via `s.optional.<scope>`, which
 * resolves to `undefined` instead of throwing.
 *
 * @example
 * ```ts
 * const isRunning = useAuiState((s) => s.thread.isRunning);
 * // template: <button disabled={isRunning.current}>…</button>
 * ```
 */
export const useAuiState = <T>(
  selector: (state: AssistantState) => T,
): { readonly current: T } => {
  const { source } = getAuiContext();

  // Wake dependents only when the selected slice changes by Object.is, matching
  // the react (useSyncExternalStore) and vue (computed) bridges: a store tick
  // that does not move the slice re-runs nothing. A selector that throws (a
  // scope shrinking out from under it) wakes so the getter surfaces it.
  const read = () => selector(getProxiedAssistantState(source.getClient()));
  const subscribe = createSubscriber((update) => {
    let last: T;
    let primed = false;
    // Seed the baseline so the first notification with an unchanged slice does
    // not wake; a selector that throws now stays unprimed and wakes on the
    // first notification, letting the getter surface the error.
    try {
      last = read();
      primed = true;
    } catch {
      /* unprimed */
    }
    return source.subscribe(() => {
      let next: T;
      try {
        next = read();
      } catch {
        primed = false;
        update();
        return;
      }
      if (primed && Object.is(next, last)) return;
      last = next;
      primed = true;
      update();
    });
  });

  return {
    get current(): T {
      subscribe();
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
  };
};

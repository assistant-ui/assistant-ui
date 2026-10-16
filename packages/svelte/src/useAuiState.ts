import { createSubscriber } from "svelte/reactivity";
import { toStore } from "svelte/store";
import { untrack } from "svelte";
import {
  getProxiedAssistantState,
  type AssistantState,
} from "@assistant-ui/store/client";
import { getAuiContext, type ScopeTarget } from "./context";

/**
 * Subscribes to a slice of `AssistantState` and returns it behind a reactive
 * `current` getter.
 *
 * Reads the surrounding provider's scopes by default (call during component
 * initialization); pass `item` (a per-item handle such as a `MessageItem`
 * from `threadMessages`) to read that item's scopes instead, from anywhere.
 *
 * Reading `current` inside an effect or template tracks the store: the read
 * re-runs when the selected slice changes by `Object.is`, so a store update
 * that does not move the slice wakes nothing. The `selector` tracks reactive
 * inputs and runs per store notification and on each read. Returning the
 * entire state object is not supported and throws. Select a field instead,
 * or compose multiple `useAuiState` calls. Returning a fresh literal defeats the
 * deduplication; select primitives or a memoized reference.
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
  options?: { item?: ScopeTarget | undefined },
): { readonly current: T } => {
  const source = (options?.item ?? getAuiContext()).source;
  const subscribeSource = createSubscriber((update) =>
    source.subscribe(update),
  );

  const read = () => selector(getProxiedAssistantState(source.getClient()));
  const snapshot = (): { value: T } | { error: unknown } => {
    subscribeSource();
    try {
      return { value: read() };
    } catch (error) {
      return { error };
    }
  };
  // Capture the component scope before createSubscriber enters a transient render effect.
  const selection = toStore(snapshot);
  const subscribe = createSubscriber((update) => {
    let previous: ReturnType<typeof snapshot> | undefined;
    const notify = (next: ReturnType<typeof snapshot>) => {
      const changed =
        previous !== undefined &&
        ("error" in next ||
          "error" in previous ||
          !Object.is(next.value, previous.value));
      previous = next;
      if (changed) {
        update();
      }
    };
    const unsubscribeSelector = selection.subscribe(notify);
    return unsubscribeSelector;
  });

  return {
    get current(): T {
      subscribe();
      const state = getProxiedAssistantState(source.getClient());
      const slice = untrack(() => selector(state));

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

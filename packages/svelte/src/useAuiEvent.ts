import { onDestroy } from "svelte";
import {
  normalizeEventSelector,
  type AssistantClient,
  type AssistantEventCallback,
  type AssistantEventName,
  type AssistantEventSelector,
  type Unsubscribe,
} from "@assistant-ui/store/client";
import { getAuiContext } from "./context";
import { isDevelopment } from "./isDevelopment";

/**
 * Subscribes to an assistant event for the lifetime of the current
 * component. Call during component initialization.
 *
 * The subscription follows the provider's current client across structural
 * changes. Use `scope: "*"` to receive emissions from any descendant scope.
 *
 * @example
 * ```ts
 * useAuiEvent("thread.modelContextUpdate", ({ threadId }) => {
 *   analytics.track("model_context_update", { threadId });
 * });
 * ```
 */
export const useAuiEvent = <TEvent extends AssistantEventName>(
  selector: AssistantEventSelector<TEvent>,
  callback: AssistantEventCallback<TEvent>,
): void => {
  const { source } = getAuiContext();
  const { scope, event } = normalizeEventSelector(selector);

  let bound: AssistantClient | undefined;
  let off: Unsubscribe | undefined;

  const bind = () => {
    const client = source.getClient();
    if (client === bound) return;
    let next: Unsubscribe;
    try {
      next = client.on(
        { scope, event } as AssistantEventSelector<TEvent>,
        callback,
      );
    } catch (error) {
      // A live config may drop the selected scope; keep the current binding and
      // retry once a later structural change makes the scope available again. A
      // selector that never resolves (a typo'd scope) surfaces here in dev,
      // matching the loud failure the react and vue bridges give.
      if (isDevelopment) console.warn(error);
      return;
    }
    off?.();
    bound = client;
    off = next;
  };

  bind();
  const unsubscribe = source.subscribe(bind);
  onDestroy(() => {
    unsubscribe();
    off?.();
  });
};

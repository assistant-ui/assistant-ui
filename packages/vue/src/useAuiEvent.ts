import { onScopeDispose } from "vue";
import {
  normalizeEventSelector,
  type AssistantClient,
  type AssistantEventCallback,
  type AssistantEventName,
  type AssistantEventSelector,
  type Unsubscribe,
} from "@assistant-ui/store/client";
import { useAuiContext } from "./context";

/**
 * Subscribes to an assistant event for the lifetime of the current effect
 * scope.
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
  const { source } = useAuiContext();
  const { scope, event } = normalizeEventSelector(selector);

  let bound: AssistantClient | undefined;
  let off: Unsubscribe | undefined;

  const bind = () => {
    const client = source.getClient();
    if (client === bound) return;
    off?.();
    bound = client;
    off = client.on(
      { scope, event } as AssistantEventSelector<TEvent>,
      callback,
    );
  };

  bind();
  const unsubscribe = source.subscribe(bind);
  onScopeDispose(() => {
    unsubscribe();
    off?.();
  });
};

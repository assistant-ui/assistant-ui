import { useEffect, useEffectEvent, useRef } from "react";
import { getClientRef, useAui } from "./useAui";
import type {
  AssistantEventName,
  AssistantEventCallback,
  AssistantEventSelector,
} from "./types/events";
import type { AssistantClient, ClientMethods } from "./types/client";
import { normalizeEventSelector } from "./types/events";
import { bindDynamicEventScope } from "./utils/dynamic-event-scope";
import { getClientId } from "./utils/client-accessor";

/**
 * Subscribes to an assistant event for the lifetime of the component.
 *
 * The subscription is established on mount and re-established whenever the
 * scope or event name changes. The `callback` is wrapped in an effect-event
 * shim, so the latest closure is invoked on each emission — you do not
 * need to memoize it.
 *
 * @param selector - Either a dotted event name like
 *   `"thread.modelContextUpdate"` or an object `{ scope, event }`. Use
 *   `scope: "*"` to subscribe at the root client and receive emissions
 *   from any descendant scope, regardless of which one is in React
 *   context.
 * @param callback - Invoked with the event payload. The most recent
 *   reference is always called. Return values are ignored, async callbacks
 *   are not awaited, and the callback cannot be called during render.
 *
 * @example
 * ```tsx
 * // React to transient model-context changes.
 * useAuiEvent("thread.modelContextUpdate", ({ threadId }) => {
 *   analytics.track("model_context_update", { threadId });
 * });
 * ```
 *
 * @example
 * ```tsx
 * // React to thread switches.
 * useAuiEvent("threadListItem.switchedTo", () => {
 *   resetLocalState();
 * });
 * ```
 *
 * @example
 * ```tsx
 * // Listen from the root client rather than the current React context.
 * useAuiEvent({ scope: "*", event: "thread.modelContextUpdate" }, (payload) => {
 *   analytics.track("model_context_update", payload);
 * });
 * ```
 */
export const useAuiEvent = <TEvent extends AssistantEventName>(
  selector: AssistantEventSelector<TEvent>,
  callback: AssistantEventCallback<TEvent>,
) => {
  const aui = useAui();
  const callbackRef = useEffectEvent(callback);
  const { scope, event } = normalizeEventSelector(selector);
  const scopeResolverRef = useRef<(client: AssistantClient) => ClientMethods>(
    (client) => getClientId(client[scope as keyof AssistantClient]) as never,
  );
  scopeResolverRef.current = (client) => {
    const clientRef = getClientRef(client);
    const current = clientRef?.latest ?? clientRef?.current ?? client;
    return getClientId(current[scope as keyof AssistantClient]) as never;
  };

  useEffect(() => {
    const listener = bindDynamicEventScope(
      (payload: unknown) => callbackRef(payload as never),
      (client) => scopeResolverRef.current(client),
    );
    return aui.on({ scope, event }, listener as never);
  }, [aui, scope, event]);
};

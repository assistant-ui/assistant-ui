import { useEffect } from "react";
import { useEffectEvent } from "use-effect-event";
import { useAui } from "./useAui";
import type {
  AssistantEventName,
  AssistantEventCallback,
  AssistantEventSelector,
} from "./types/events";
import { normalizeEventSelector } from "./types/events";

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
  useEffect(() => aui.on({ scope, event }, callbackRef), [aui, scope, event]);
};

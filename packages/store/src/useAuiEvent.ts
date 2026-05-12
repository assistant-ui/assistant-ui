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
 * @param selector - Either a dotted event name like `"thread.runStart"`
 *   or an object `{ scope, event }`. Use `scope: "*"` to listen across
 *   every instance of a scope rather than only the one in context.
 * @param callback - Invoked with the event payload. The most recent
 *   reference is always called.
 *
 * @example
 * ```tsx
 * // Scroll the viewport when the active thread starts a run.
 * useAuiEvent("thread.runStart", () => {
 *   scrollToBottom();
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
 * // Listen globally across every thread, not just the one in scope.
 * useAuiEvent({ scope: "*", event: "thread.runEnd" }, (payload) => {
 *   analytics.track("run_end", payload);
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
  useEffect(
    () => aui.on({ scope, event }, callbackRef),
    [aui, scope, event, callbackRef],
  );
};

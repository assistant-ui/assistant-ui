import type { AssistantClient, Unsubscribe } from "../types/client";
import type {
  AssistantEventName,
  AssistantEventCallback,
  AssistantEventSelector,
} from "../types/events";

/**
 * How a scoped listener resolves the instance it is filtered against.
 *
 * `"snapshot"` uses the scope as bound on the client `on` was called on, so
 * the listener stays with that instance for its lifetime. `"live"` uses the
 * scope on the host's current client at delivery time, so a listener follows a
 * derived scope through a structural swap — including for an event emitted by
 * the swap itself, which is delivered before React can re-render the
 * subscriber with the new client.
 */
export type EventBinding = "snapshot" | "live";

/**
 * Subscribes through `client.on` with an explicit binding mode. A client that
 * does not understand the mode (a hand-built parent) ignores it and keeps the
 * snapshot behavior.
 */
export const onWithBinding = <TEvent extends AssistantEventName>(
  client: AssistantClient,
  selector: AssistantEventSelector<TEvent>,
  callback: AssistantEventCallback<TEvent>,
  binding: EventBinding,
): Unsubscribe => {
  const on = client.on as unknown as (
    selector: AssistantEventSelector<TEvent>,
    callback: AssistantEventCallback<TEvent>,
    binding: EventBinding,
  ) => Unsubscribe;
  return on.call(client, selector, callback, binding);
};

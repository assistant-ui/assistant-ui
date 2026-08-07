import type { AssistantClient, ClientMethods } from "../types/client";

type EventListener = (payload: unknown) => void;
type ScopeResolver = (client: AssistantClient) => ClientMethods;

const scopeResolvers = new WeakMap<EventListener, ScopeResolver>();

export const bindDynamicEventScope = (
  listener: EventListener,
  resolve: ScopeResolver,
): EventListener => {
  scopeResolvers.set(listener, resolve);
  return listener;
};

export const resolveDynamicEventScope = (
  listener: EventListener,
  client: AssistantClient,
): ClientMethods | undefined => scopeResolvers.get(listener)?.(client);

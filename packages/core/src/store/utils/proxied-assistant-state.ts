import { getClientState } from "../tapClientResource";
import type { AssistantClient, AssistantState } from "../types/client";
import { BaseProxyHandler, handleIntrospectionProp } from "./BaseProxyHandler";

export const PROXIED_ASSISTANT_STATE_SYMBOL = Symbol(
  "assistant-ui.store.proxiedAssistantState",
);

const isIgnoredKey = (key: string | symbol): key is "on" | "subscribe" => {
  return key === "on" || key === "subscribe" || typeof key === "symbol";
};

/**
 * Proxied state that lazily accesses scope states
 */
export const createProxiedAssistantState = (
  client: AssistantClient,
): AssistantState => {
  class ProxiedAssistantStateProxyHandler
    extends BaseProxyHandler
    implements ProxyHandler<AssistantState>
  {
    get(_: unknown, prop: string | symbol) {
      const introspection = handleIntrospectionProp(prop, "AssistantState");
      if (introspection !== false) return introspection;
      const scope = prop as keyof AssistantClient;
      if (isIgnoredKey(scope)) return undefined;
      return getClientState(client[scope]());
    }

    ownKeys(): ArrayLike<string | symbol> {
      return Object.keys(client).filter((key) => !isIgnoredKey(key));
    }

    has(_: unknown, prop: string | symbol): boolean {
      return !isIgnoredKey(prop) && prop in client;
    }
  }

  return new Proxy<AssistantState>(
    {} as AssistantState,
    new ProxiedAssistantStateProxyHandler(),
  );
};

export const getProxiedAssistantState = (
  client: AssistantClient,
): AssistantState => {
  return (
    client as unknown as { [PROXIED_ASSISTANT_STATE_SYMBOL]: AssistantState }
  )[PROXIED_ASSISTANT_STATE_SYMBOL];
};

"use client";
import { getClientState } from "../useClientResource";
import type { AssistantClient, AssistantState } from "../types/client";
import { BaseProxyHandler, handleIntrospectionProp } from "./BaseProxyHandler";

const isIgnoredKey = (key: string | symbol): key is "on" | "subscribe" => {
  return key === "on" || key === "subscribe" || typeof key === "symbol";
};

/**
 * Proxied state that lazily accesses scope states
 */
const createProxiedAssistantState = (
  client: AssistantClient,
): AssistantState => {
  let optionalState: AssistantState["optional"] | undefined;

  class OptionalAssistantStateProxyHandler
    extends BaseProxyHandler
    implements ProxyHandler<AssistantState["optional"]>
  {
    get(_: unknown, prop: string | symbol) {
      const introspection = handleIntrospectionProp(
        prop,
        "OptionalAssistantState",
      );
      if (introspection !== false) return introspection;
      const scope = prop as keyof AssistantClient;
      if (isIgnoredKey(scope)) return undefined;
      if (client[scope].source === null) return undefined;
      return getClientState(client[scope]());
    }

    ownKeys(): ArrayLike<string | symbol> {
      return Object.keys(client).filter((key) => !isIgnoredKey(key));
    }

    has(_: unknown, prop: string | symbol): boolean {
      return !isIgnoredKey(prop) && prop in client;
    }
  }

  class ProxiedAssistantStateProxyHandler
    extends BaseProxyHandler
    implements ProxyHandler<AssistantState>
  {
    get(_: unknown, prop: string | symbol) {
      const introspection = handleIntrospectionProp(prop, "AssistantState");
      if (introspection !== false) return introspection;
      if (prop === "optional") {
        return (optionalState ??= new Proxy<AssistantState["optional"]>(
          {} as AssistantState["optional"],
          new OptionalAssistantStateProxyHandler(),
        ));
      }
      const scope = prop as keyof AssistantClient;
      if (isIgnoredKey(scope)) return undefined;
      return getClientState(client[scope]());
    }

    ownKeys(): ArrayLike<string | symbol> {
      return [
        ...Object.keys(client).filter((key) => !isIgnoredKey(key)),
        "optional",
      ];
    }

    has(_: unknown, prop: string | symbol): boolean {
      return prop === "optional" || (!isIgnoredKey(prop) && prop in client);
    }
  }

  return new Proxy<AssistantState>(
    {} as AssistantState,
    new ProxiedAssistantStateProxyHandler(),
  );
};

const stateProxies = new WeakMap<AssistantClient, AssistantState>();

export const getProxiedAssistantState = (
  client: AssistantClient,
): AssistantState => {
  let proxy = stateProxies.get(client);
  if (!proxy) {
    proxy = createProxiedAssistantState(client);
    stateProxies.set(client, proxy);
  }
  return proxy;
};

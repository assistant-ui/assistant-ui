"use client";
import {
  collectClientDependencies,
  getClientState,
  trackClientDependency,
} from "../useClientResource";
import type {
  AssistantClient,
  AssistantState,
  ClientMethods,
} from "../types/client";
import { BaseProxyHandler, handleIntrospectionProp } from "./BaseProxyHandler";
import { isScopeAvailable } from "./client-accessor";
import { clientScopeKeys, isIgnoredClientKey } from "./client-keys";

export const collectAssistantStateDependencies = collectClientDependencies;

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
      if (isIgnoredClientKey(scope)) return undefined;
      // Collapses absent (a hand-built parent chain without the scope) and
      // unavailable into undefined; only the base state throws for those
      if (!isScopeAvailable(client[scope])) return undefined;
      const scopeClient = client[scope]() as ClientMethods;
      trackClientDependency(scopeClient);
      return getClientState(scopeClient);
    }

    ownKeys(): ArrayLike<string | symbol> {
      return clientScopeKeys(client);
    }

    has(_: unknown, prop: string | symbol): boolean {
      return !isIgnoredClientKey(prop) && prop in client;
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
      if (isIgnoredClientKey(scope)) return undefined;
      const scopeClient = client[scope]() as ClientMethods;
      trackClientDependency(scopeClient);
      return getClientState(scopeClient);
    }

    ownKeys(): ArrayLike<string | symbol> {
      return [...clientScopeKeys(client), "optional"];
    }

    has(_: unknown, prop: string | symbol): boolean {
      return (
        prop === "optional" || (!isIgnoredClientKey(prop) && prop in client)
      );
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

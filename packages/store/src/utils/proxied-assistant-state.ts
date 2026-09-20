"use client";
import { getClientState } from "../useClientResource";
import type { AssistantClient, AssistantState } from "../types/client";
import { BaseProxyHandler, handleIntrospectionProp } from "./BaseProxyHandler";
import { isScopeAvailable } from "./client-accessor";
import { clientScopeKeys, isIgnoredClientKey } from "./client-keys";

let readWindow = 0;
let readWindowDepth = 0;

/**
 * Opens a window in which a scope's state is resolved at most once per client.
 *
 * Resolving one scope walks the client accessor, the client proxy and the
 * resource output, and a notification flush re-runs every mounted selector, so
 * the same pair is resolved many times over. The window only spans a
 * synchronous flush, during which the store publishes nothing new.
 */
export const withBatchedStateReads = <T>(fn: () => T): T => {
  readWindow++;
  readWindowDepth++;
  try {
    return fn();
  } finally {
    readWindowDepth--;
    readWindow++;
  }
};

type ScopeKey = Exclude<keyof AssistantClient, "optional" | "subscribe" | "on">;

/**
 * Proxied state that lazily accesses scope states
 */
const createProxiedAssistantState = (
  client: AssistantClient,
): AssistantState => {
  let optionalState: AssistantState["optional"] | undefined;

  const scopeCache = new Map<string, unknown>();
  let scopeCacheWindow = -1;

  const readScopeState = (scope: ScopeKey) => {
    if (readWindowDepth === 0) return getClientState(client[scope]());

    if (scopeCacheWindow !== readWindow) {
      scopeCache.clear();
      scopeCacheWindow = readWindow;
    } else if (scopeCache.has(scope)) {
      return scopeCache.get(scope);
    }

    const state = getClientState(client[scope]());
    scopeCache.set(scope, state);
    return state;
  };

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
      return readScopeState(scope);
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
      return readScopeState(scope);
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

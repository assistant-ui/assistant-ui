import type {
  AssistantClientAccessor,
  ClientMethods,
  ClientNames,
} from "../types/client";
import { handleIntrospectionProp } from "./BaseProxyHandler";

const CLIENT_ID_SYMBOL = Symbol("assistant-ui.store.clientId");

declare const clientIdBrand: unique symbol;

type AccessorMeta = {
  name: ClientNames;
  source: ClientNames | "root";
  query: Record<string, unknown>;
};

type AnyRecord = Record<string | symbol, unknown>;

export const createClientAccessor = <K extends ClientNames>(
  meta: AccessorMeta,
  read: () => ClientMethods,
): AssistantClientAccessor<K> => {
  const proxy = new Proxy((() => {}) as unknown as AssistantClientAccessor<K>, {
    apply: () => {
      read();
      return proxy;
    },
    get: (_, prop) => {
      if (prop === "source") return meta.source;
      if (prop === "query") return meta.query;
      if (prop === "name") return meta.name;
      if (prop === CLIENT_ID_SYMBOL) return getClientId(read());
      return (read() as AnyRecord)[prop];
    },
    has: (_, prop) =>
      prop === "source" ||
      prop === "query" ||
      prop === "name" ||
      prop === CLIENT_ID_SYMBOL ||
      prop in read(),
    ownKeys: () => Reflect.ownKeys(read()),
    getOwnPropertyDescriptor: (_, prop) => {
      if (typeof prop === "symbol" || !(prop in read())) return undefined;
      return {
        value: (read() as AnyRecord)[prop],
        writable: false,
        enumerable: true,
        configurable: true,
      };
    },
  });
  return proxy;
};

export const createErrorClientAccessor = (
  message: string,
  name?: string,
): AssistantClientAccessor<ClientNames> => {
  const fail = () => {
    throw new Error(message);
  };
  return new Proxy(
    (() => {}) as unknown as AssistantClientAccessor<ClientNames>,
    {
      apply: fail,
      get: (_, prop) => {
        if (prop === "source" || prop === "query") return null;
        if (prop === "name") return name;
        if (prop === CLIENT_ID_SYMBOL) return fail();
        const introspection = handleIntrospectionProp(
          prop,
          "AssistantClientAccessor",
        );
        if (introspection !== false) return introspection;
        return fail();
      },
      has: (_, prop) =>
        prop === "source" || prop === "query" || prop === "name",
      ownKeys: () => [],
      getOwnPropertyDescriptor: () => undefined,
    },
  );
};

/**
 * Returns the opaque identity of a bound client instance.
 *
 * The identity is stable for the lifetime of the bound client: the same
 * object is returned no matter how many accessor layers wrap the client, so
 * it is a reliable `WeakMap` key for per-client caches. Throws if the client
 * is an accessor for an unavailable scope.
 */
export const getClientId = (client: object): getClientId.ClientId =>
  ((client as AnyRecord)[CLIENT_ID_SYMBOL] ?? client) as getClientId.ClientId;

export namespace getClientId {
  export type ClientId = { readonly [clientIdBrand]: never };
}

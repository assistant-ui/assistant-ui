import type {
  AssistantClientAccessor,
  ClientMethods,
  ClientNames,
} from "../types/client";
import { handleIntrospectionProp } from "./BaseProxyHandler";

const AUI_INSTANCE_SYMBOL = Symbol("assistant-ui.store.auiInstance");

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
      if (prop === AUI_INSTANCE_SYMBOL) return read();
      return (read() as AnyRecord)[prop];
    },
    has: (_, prop) =>
      prop === "source" ||
      prop === "query" ||
      prop === "name" ||
      prop === AUI_INSTANCE_SYMBOL ||
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

export const getBoundClient = (accessor: object): ClientMethods =>
  (accessor as AnyRecord)[AUI_INSTANCE_SYMBOL] as ClientMethods;

export const unwrapClientAccessor = <T>(value: T): T =>
  ((value as AnyRecord)[AUI_INSTANCE_SYMBOL] as T) ?? value;

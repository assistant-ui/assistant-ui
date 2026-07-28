import type {
  AssistantClientAccessor,
  AssistantClientAccessorMeta,
  ClientMethods,
  ClientNames,
} from "../types/client";
import { handleIntrospectionProp } from "./BaseProxyHandler";

const AUI_META_SYMBOL = Symbol("assistant-ui.store.auiMeta");
const AUI_INSTANCE_SYMBOL = Symbol("assistant-ui.store.auiInstance");

type AnyAccessorMeta = {
  name: ClientNames;
  source: ClientNames | "root";
  query: Record<string, unknown>;
};

type AnyRecord = Record<string | symbol, unknown>;

export const createClientAccessor = <K extends ClientNames>(
  meta: AnyAccessorMeta,
  read: () => ClientMethods,
): AssistantClientAccessor<K> => {
  const proxy = new Proxy((() => {}) as unknown as AssistantClientAccessor<K>, {
    apply: () => {
      read();
      return proxy;
    },
    get: (_, prop) => {
      if (prop === AUI_META_SYMBOL) return meta;
      if (prop === AUI_INSTANCE_SYMBOL) return read();
      return (read() as AnyRecord)[prop];
    },
    has: (_, prop) =>
      prop === AUI_META_SYMBOL ||
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

const NULL_ACCESSOR_META = { source: null, query: null };

export const createErrorClientAccessor = (
  message: string,
): AssistantClientAccessor<ClientNames> => {
  const fail = () => {
    throw new Error(message);
  };
  return new Proxy(
    (() => {}) as unknown as AssistantClientAccessor<ClientNames>,
    {
      apply: fail,
      get: (_, prop) => {
        if (prop === AUI_META_SYMBOL) return NULL_ACCESSOR_META;
        const introspection = handleIntrospectionProp(
          prop,
          "AssistantClientAccessor",
        );
        if (introspection !== false) return introspection;
        return fail();
      },
      has: (_, prop) => prop === AUI_META_SYMBOL,
      ownKeys: () => [],
      getOwnPropertyDescriptor: () => undefined,
    },
  );
};

/**
 * Reads the selection metadata of a client accessor — the scope name plus
 * the source/query it was selected with.
 */
export const getAuiMeta = <K extends ClientNames>(
  accessor: AssistantClientAccessor<K>,
): AssistantClientAccessorMeta<K> =>
  (accessor as unknown as AnyRecord)[
    AUI_META_SYMBOL
  ] as AssistantClientAccessorMeta<K>;

export const getBoundClient = (
  accessor: AssistantClientAccessor<ClientNames>,
): ClientMethods =>
  (accessor as unknown as AnyRecord)[AUI_INSTANCE_SYMBOL] as ClientMethods;

export const unwrapClientAccessor = (value: ClientMethods): ClientMethods =>
  ((value as AnyRecord)[AUI_INSTANCE_SYMBOL] as ClientMethods) ?? value;

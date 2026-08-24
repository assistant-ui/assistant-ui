import { createContext, useContext } from "react";
import { useContextProvider } from "@assistant-ui/tap";
import type { AssistantClient } from "../types/client";
import { BaseProxyHandler, handleIntrospectionProp } from "./BaseProxyHandler";
import { createErrorClientAccessor } from "./client-accessor";
import { createOptionalClientView } from "./optional-client-view";

const NO_OP_SUBSCRIBE = () => () => {};

const MISSING_PROVIDER_MESSAGE =
  "You are using a component or hook that requires an AuiProvider. Wrap your component in an <AuiProvider> component.";

class EmptyAssistantClientProxyHandler
  extends BaseProxyHandler
  implements ProxyHandler<AssistantClient>
{
  readonly #displayName: string;
  readonly #messageOf: (prop: string) => string;
  readonly #getClient: () => AssistantClient;
  #optional: AssistantClient["optional"] | undefined;

  constructor(
    displayName: string,
    messageOf: (prop: string) => string,
    getClient: () => AssistantClient,
  ) {
    super();
    this.#displayName = displayName;
    this.#messageOf = messageOf;
    this.#getClient = getClient;
  }

  get(_: unknown, prop: string | symbol) {
    if (prop === "subscribe") return NO_OP_SUBSCRIBE;
    if (prop === "on") return NO_OP_SUBSCRIBE;
    if (prop === "optional") {
      return (this.#optional ??= createOptionalClientView(this.#getClient()));
    }
    const introspection = handleIntrospectionProp(prop, this.#displayName);
    if (introspection !== false) return introspection;
    return createErrorClientAccessor(
      this.#messageOf(String(prop)),
      String(prop),
    );
  }

  ownKeys(): ArrayLike<string | symbol> {
    return ["subscribe", "on", "optional"];
  }

  // Built clients define `optional` as a non-enumerable own property; the
  // proxy flavors report the same shape so spreads and Object.keys stay
  // uniform across every client the library hands out.
  override getOwnPropertyDescriptor(_: unknown, prop: string | symbol) {
    if (prop !== "optional") return super.getOwnPropertyDescriptor(_, prop);
    const value = this.get(_, prop);
    if (value === undefined) return undefined;
    return { value, writable: false, enumerable: false, configurable: true };
  }

  has(_: unknown, prop: string | symbol): boolean {
    return prop === "subscribe" || prop === "on" || prop === "optional";
  }
}

const createEmptyAssistantClient = (
  displayName: string,
  messageOf: (prop: string) => string,
): AssistantClient => {
  const client: AssistantClient = new Proxy<AssistantClient>(
    {} as AssistantClient,
    new EmptyAssistantClientProxyHandler(displayName, messageOf, () => client),
  );
  return client;
};

/** Default context value - throws "wrap in AuiProvider" error */
export const DefaultAssistantClient: AssistantClient =
  createEmptyAssistantClient(
    "DefaultAssistantClient",
    () => MISSING_PROVIDER_MESSAGE,
  );

/** Root prototype for created clients - throws "scope not defined" error */
export const createRootAssistantClient = (): AssistantClient =>
  new Proxy<AssistantClient>({} as AssistantClient, {
    get(_: AssistantClient, prop: string | symbol) {
      const introspection = handleIntrospectionProp(prop, "AssistantClient");
      if (introspection !== false) return introspection;

      return createErrorClientAccessor(
        `The current scope does not have a "${String(prop)}" property.`,
        String(prop),
      );
    },
  });

/**
 * React Context for the AssistantClient
 */
export const AssistantContext = createContext<AssistantClient>(
  DefaultAssistantClient,
);

const NOOP_EFFECT = () => {};
const tapEffects = new WeakMap<AssistantClient, () => void>();

export const getTapEffects = (client: AssistantClient): (() => void) => {
  return tapEffects.get(client) ?? NOOP_EFFECT;
};

/**
 * Records the tap host's effects callback for clients created by the
 * deprecated `useAui({...})` overload; the AuiProvider the client is passed
 * to mounts the host's commit ahead of its children's effects.
 */
export const setTapEffects = (
  client: AssistantClient,
  effects: () => void,
): void => {
  tapEffects.set(client, effects);
};

export const useAssistantContextValue = (): AssistantClient => {
  return useContext(AssistantContext);
};

export const useAssistantContextProvider = <T,>(
  value: AssistantClient,
  fn: () => T,
): T => {
  return useContextProvider(AssistantContext, value, fn);
};

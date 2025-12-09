import React, { createContext, useContext } from "react";
import type { AssistantClient, AssistantClientAccessor } from "../types/client";
import {
  createProxiedAssistantState,
  PROXIED_ASSISTANT_STATE_SYMBOL,
} from "./proxied-assistant-state";
import { BaseProxyHandler } from "./BaseProxyHandler";

const NO_OP_SUBSCRIBE = () => () => {};

const createErrorClientField = (
  message: string,
): AssistantClientAccessor<never> => {
  const fn = (() => {
    throw new Error(message);
  }) as AssistantClientAccessor<never>;
  fn.source = null;
  fn.query = null;
  return fn;
};

class OuterClientProxyHandler
  extends BaseProxyHandler
  implements ProxyHandler<AssistantClient>
{
  get(_: unknown, prop: string | symbol) {
    if (prop === "subscribe") return NO_OP_SUBSCRIBE;
    if (prop === "on") return NO_OP_SUBSCRIBE;
    if (prop === PROXIED_ASSISTANT_STATE_SYMBOL)
      return OuterClientProxiedAssistantState;
    if (typeof prop === "symbol") return undefined;
    return createErrorClientField(
      `The current scope does not have a "${String(prop)}" property.`,
    );
  }

  ownKeys(): ArrayLike<string | symbol> {
    return ["subscribe", "on", PROXIED_ASSISTANT_STATE_SYMBOL];
  }

  has(_: unknown, prop: string | symbol): boolean {
    return (
      prop === "subscribe" ||
      prop === "on" ||
      prop === PROXIED_ASSISTANT_STATE_SYMBOL
    );
  }
}
/** Default context value - throws "wrap in AssistantProvider" error */
export const OuterClient: AssistantClient = new Proxy<AssistantClient>(
  {} as AssistantClient,
  new OuterClientProxyHandler(),
);

export const OuterClientProxiedAssistantState =
  createProxiedAssistantState(OuterClient);

class InnerClientProxyHandler
  extends BaseProxyHandler
  implements ProxyHandler<AssistantClient>
{
  get(_: unknown, prop: string | symbol) {
    if (prop === "subscribe") return NO_OP_SUBSCRIBE;
    if (prop === "on") return NO_OP_SUBSCRIBE;
    if (typeof prop === "symbol") return undefined;
    return createErrorClientField(
      `The current scope does not have a "${String(prop)}" property.`,
    );
  }

  ownKeys(): ArrayLike<string | symbol> {
    return ["subscribe", "on"];
  }

  has(_: unknown, prop: string | symbol): boolean {
    return prop === "subscribe" || prop === "on";
  }
}

/** Root prototype for created clients - throws "scope not defined" error */
export const InnerClient: AssistantClient = new Proxy<AssistantClient>(
  {} as AssistantClient,
  new InnerClientProxyHandler(),
);

/**
 * React Context for the AssistantClient
 */
const AssistantContext = createContext<AssistantClient>(OuterClient);

export const useAssistantContextValue = (): AssistantClient => {
  return useContext(AssistantContext);
};

/**
 * Provider component for AssistantClient
 *
 * @example
 * ```typescript
 * <AssistantProvider client={client}>
 *   <YourApp />
 * </AssistantProvider>
 * ```
 */
export const AssistantProvider = ({
  client,
  children,
}: {
  client: AssistantClient;
  children: React.ReactNode;
}): React.ReactElement => {
  return (
    <AssistantContext.Provider value={client}>
      {children}
    </AssistantContext.Provider>
  );
};

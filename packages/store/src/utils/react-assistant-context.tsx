import React, { createContext, useContext } from "react";
import type {
  AssistantClient,
  AssistantClientAccessor,
} from "@assistant-ui/core/store";
import {
  createProxiedAssistantState,
  PROXIED_ASSISTANT_STATE_SYMBOL,
  BaseProxyHandler,
  handleIntrospectionProp,
} from "@assistant-ui/core/store";

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

class DefaultAssistantClientProxyHandler
  extends BaseProxyHandler
  implements ProxyHandler<AssistantClient>
{
  get(_: unknown, prop: string | symbol) {
    if (prop === "subscribe") return NO_OP_SUBSCRIBE;
    if (prop === "on") return NO_OP_SUBSCRIBE;
    if (prop === PROXIED_ASSISTANT_STATE_SYMBOL)
      return DefaultAssistantClientProxiedAssistantState;
    const introspection = handleIntrospectionProp(
      prop,
      "DefaultAssistantClient",
    );
    if (introspection !== false) return introspection;
    return createErrorClientField(
      "You are using a component or hook that requires an AuiProvider. Wrap your component in an <AuiProvider> component.",
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
/** Default context value - throws "wrap in AuiProvider" error */
export const DefaultAssistantClient: AssistantClient =
  new Proxy<AssistantClient>(
    {} as AssistantClient,
    new DefaultAssistantClientProxyHandler(),
  );

const DefaultAssistantClientProxiedAssistantState = createProxiedAssistantState(
  DefaultAssistantClient,
);

/** Root prototype for created clients - throws "scope not defined" error */
export const createRootAssistantClient = (): AssistantClient =>
  new Proxy<AssistantClient>({} as AssistantClient, {
    get(_: AssistantClient, prop: string | symbol) {
      const introspection = handleIntrospectionProp(prop, "AssistantClient");
      if (introspection !== false) return introspection;

      return createErrorClientField(
        `The current scope does not have a "${String(prop)}" property.`,
      );
    },
  });

/**
 * React Context for the AssistantClient
 */
const AssistantContext = createContext<AssistantClient>(DefaultAssistantClient);

export const useAssistantContextValue = (): AssistantClient => {
  return useContext(AssistantContext);
};

/**
 * Provider component for AssistantClient
 *
 * @example
 * ```typescript
 * <AuiProvider value={aui}>
 *   <YourApp />
 * </AuiProvider>
 * ```
 */
export const AuiProvider = ({
  value,
  children,
}: {
  value: AssistantClient;
  children: React.ReactNode;
}): React.ReactElement => {
  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
};

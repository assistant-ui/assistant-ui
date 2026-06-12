import type React from "react";
import { createContext, useContext, useEffect } from "react";
import type { AssistantClient, AssistantClientAccessor } from "../types/client";
import {
  createProxiedAssistantState,
  PROXIED_ASSISTANT_STATE_SYMBOL,
} from "./proxied-assistant-state";
import { BaseProxyHandler, handleIntrospectionProp } from "./BaseProxyHandler";

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

/**
 * Carries the tap host's effects callback on the client so AuiProvider can
 * mount the host's commit ahead of its children's effects.
 */
export const AUI_USE_EFFECTS_SYMBOL = Symbol("assistant-ui.store.useEffects");

const NOOP_EFFECT = () => {};

const getTapEffects = (client: AssistantClient): (() => void) => {
  return (
    (client as Record<symbol, never>)[AUI_USE_EFFECTS_SYMBOL] ?? NOOP_EFFECT
  );
};

const UseTapEffects = () => {
  "use no memo";

  const aui = useAssistantContextValue();
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(getTapEffects(aui));
  return null;
};

export const useAssistantContextValue = (): AssistantClient => {
  return useContext(AssistantContext);
};

/**
 * Supplies an `AssistantClient` to the React tree.
 *
 * Place near the root of any subtree that uses {@link useAui} or the
 * primitives built on it. Components rendered outside an `AuiProvider`
 * receive a default client whose scope accessors throw on use, so
 * missing-provider mistakes surface at the point of use.
 *
 * When mounting a runtime built with one of the runtime hooks, use
 * {@link AssistantRuntimeProvider} — it installs an `AuiProvider`
 * internally — rather than wiring `AuiProvider` yourself.
 *
 * @example
 * ```tsx
 * function ScopedAssistant({ children, scopes }) {
 *   const aui = useAui(scopes);
 *
 *   return <AuiProvider value={aui}>{children}</AuiProvider>;
 * }
 * ```
 */
export const AuiProvider = ({
  value,
  children,
}: {
  /** Assistant client to expose to descendants. */
  value: AssistantClient;
  /** Subtree that may read from the client. */
  children: React.ReactNode;
}): React.ReactElement => {
  // The <UseTapEffects /> element must be created fresh each render
  "use no memo";
  return (
    <AssistantContext.Provider value={value}>
      <UseTapEffects />
      {children}
    </AssistantContext.Provider>
  );
};

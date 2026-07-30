import type React from "react";
import { createContext, useContext, useEffect } from "react";
import { useContextProvider } from "@assistant-ui/tap";
import type { AssistantClient } from "../types/client";
import { BaseProxyHandler, handleIntrospectionProp } from "./BaseProxyHandler";
import { createErrorClientAccessor } from "./client-accessor";

const NO_OP_SUBSCRIBE = () => () => {};

const MISSING_PROVIDER_MESSAGE =
  "You are using a component or hook that requires an AuiProvider. Wrap your component in an <AuiProvider> component.";

class EmptyAssistantClientProxyHandler
  extends BaseProxyHandler
  implements ProxyHandler<AssistantClient>
{
  readonly #displayName: string;
  readonly #messageOf: (prop: string) => string;

  constructor(displayName: string, messageOf: (prop: string) => string) {
    super();
    this.#displayName = displayName;
    this.#messageOf = messageOf;
  }

  get(_: unknown, prop: string | symbol) {
    if (prop === "subscribe") return NO_OP_SUBSCRIBE;
    if (prop === "on") return NO_OP_SUBSCRIBE;
    const introspection = handleIntrospectionProp(prop, this.#displayName);
    if (introspection !== false) return introspection;
    return createErrorClientAccessor(
      this.#messageOf(String(prop)),
      String(prop),
    );
  }

  ownKeys(): ArrayLike<string | symbol> {
    return ["subscribe", "on"];
  }

  has(_: unknown, prop: string | symbol): boolean {
    return prop === "subscribe" || prop === "on";
  }
}

const createEmptyAssistantClient = (
  displayName: string,
  messageOf: (prop: string) => string,
): AssistantClient =>
  new Proxy<AssistantClient>(
    {} as AssistantClient,
    new EmptyAssistantClientProxyHandler(displayName, messageOf),
  );

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
const AssistantContext = createContext<AssistantClient>(DefaultAssistantClient);

const NOOP_EFFECT = () => {};
const tapEffects = new WeakMap<AssistantClient, () => void>();

const getTapEffects = (client: AssistantClient): (() => void) => {
  return tapEffects.get(client) ?? NOOP_EFFECT;
};

/**
 * Records the tap host's effects callback so AuiProvider can mount the host's
 * commit ahead of its children's effects.
 */
export const setTapEffects = (
  client: AssistantClient,
  effects: () => void,
): void => {
  tapEffects.set(client, effects);
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

export const useAssistantContextProvider = <T,>(
  value: AssistantClient,
  fn: () => T,
): T => {
  return useContextProvider(AssistantContext, value, fn);
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
export const AuiProvider: {
  (props: {
    /** Assistant client to expose to descendants. */
    value: AssistantClient;
    /** Subtree that may read from the client. */
    children: React.ReactNode;
  }): React.ReactElement;
  /**
   * Provides an isolated empty root: scopes from surrounding providers do not
   * leak past the boundary.
   *
   * @deprecated This API is still under active development and might change without notice.
   */
  (props: { value: null; children: React.ReactNode }): React.ReactElement;
} = ({
  value,
  children,
}: {
  value: AssistantClient | null;
  children: React.ReactNode;
}): React.ReactElement => {
  // The <UseTapEffects /> element must be created fresh each render
  "use no memo";
  return (
    <AssistantContext.Provider value={value ?? DefaultAssistantClient}>
      <UseTapEffects />
      {children}
    </AssistantContext.Provider>
  );
};

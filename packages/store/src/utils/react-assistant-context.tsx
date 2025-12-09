import React, { createContext, useContext } from "react";
import type { AssistantClient, AssistantClientAccessor } from "../types/client";

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

/** Default context value - throws "wrap in AssistantProvider" error */
export const OuterClient: AssistantClient = new Proxy({} as AssistantClient, {
  get(_, prop: string) {
    if (prop === "subscribe") return NO_OP_SUBSCRIBE;
    if (prop === "on") return NO_OP_SUBSCRIBE;
    return createErrorClientField(
      "You need to wrap this component/hook in <AssistantProvider>",
    );
  },
});

/** Root prototype for created clients - throws "scope not defined" error */
export const InnerClient: AssistantClient = new Proxy({} as AssistantClient, {
  get(_, prop: string) {
    if (prop === "subscribe") return NO_OP_SUBSCRIBE;
    if (prop === "on") return NO_OP_SUBSCRIBE;
    return createErrorClientField(
      `The current scope does not have a "${prop}" property.`,
    );
  },
});

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

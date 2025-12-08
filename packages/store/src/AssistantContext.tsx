import React, { createContext, useContext } from "react";
import type { AssistantClient, AssistantClients, ClientField } from "./types";
import { hasRegisteredClient } from "./ClientRegistry";

const NO_OP_SUBSCRIBE = () => () => {};
const NO_OP_CLIENT_FIELD = (() => {
  const fn = (() => {
    throw new Error(
      "You need to wrap this component/hook in <AssistantProvider>",
    );
  }) as ClientField<never>;
  fn.source = null;
  fn.query = null;
  return fn;
})();

/**
 * React Context for the AssistantClient
 */
const AssistantContext = createContext<AssistantClient>(
  new Proxy({} as AssistantClient, {
    get(_, prop: string) {
      // Allow access to subscribe and on without error
      if (prop === "subscribe") return NO_OP_SUBSCRIBE;
      if (prop === "on") return NO_OP_SUBSCRIBE;

      // If this is a registered client, return a function that errors when called or accessed
      if (hasRegisteredClient(prop as keyof AssistantClients))
        return NO_OP_CLIENT_FIELD;

      return null;
    },
  }),
);

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

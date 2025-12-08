import React, { createContext, useContext } from "react";
import type { AssistantClient, ClientAccessor } from "../types/client";

const NO_OP_SUBSCRIBE = () => () => {};
const NO_OP_CLIENT_FIELD = (() => {
  const fn = (() => {
    throw new Error(
      "You need to wrap this component/hook in <AssistantProvider>",
    );
  }) as ClientAccessor<never>;
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

      // Return error field for any client access outside AssistantProvider
      return NO_OP_CLIENT_FIELD;
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

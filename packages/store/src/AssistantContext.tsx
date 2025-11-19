import React, { createContext, useContext } from "react";
import type { AssistantClient } from "./types";

/**
 * React Context for the AssistantClient
 */
export const AssistantContext = createContext<AssistantClient>(
  new Proxy({} as AssistantClient, {
    get(_, prop: string) {
      throw new Error(
        `Scope "${prop}" is not available. Did you forget to add it to useAssistantClient() or wrap your component in <AssistantProvider>?`,
      );
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

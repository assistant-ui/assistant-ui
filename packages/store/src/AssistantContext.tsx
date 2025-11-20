import React, { createContext, useContext } from "react";
import type { AssistantClient, AssistantScopes, ScopeField } from "./types";
import { hasRegisteredScope } from "./ScopeRegistry";

const NO_OP_SUBSCRIBE = () => () => {};
const NO_OP_FLUSH_SYNC = () => {};
const NO_OP_SCOPE_FIELD = (() => {
  const fn = (() => {
    throw new Error(
      "You need to wrap this component/hook in <AssistantProvider>",
    );
  }) as ScopeField<never>;
  fn.source = null;
  fn.query = null;
  return fn;
})();

/**
 * React Context for the AssistantClient
 */
export const AssistantContext = createContext<AssistantClient>(
  new Proxy({} as AssistantClient, {
    get(_, prop: string) {
      // Allow access to subscribe and flushSync without error
      if (prop === "subscribe") return NO_OP_SUBSCRIBE;

      if (prop === "flushSync") return NO_OP_FLUSH_SYNC;

      // If this is a registered scope, return a function that errors when called or accessed
      if (hasRegisteredScope(prop as keyof AssistantScopes))
        return NO_OP_SCOPE_FIELD;

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

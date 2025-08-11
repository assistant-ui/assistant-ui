import { ReactNode } from "react";
import { AssistantContext } from "./AssistantContext";
import { AssistantActionsContext } from "./AssistantActionsContext";
import { AssistantClient } from "../../client/AssistantClient";
import { ThreadProvider } from "../thread/ThreadProvider";

export namespace AssistantProvider {
  export interface Props {
    client: AssistantClient;
    children: ReactNode;
  }
}

export function AssistantProvider({
  client,
  children,
}: AssistantProvider.Props) {
  return (
    <AssistantContext.Provider value={client}>
      <AssistantActionsContext.Provider value={client.actions}>
        <ThreadProvider>{children}</ThreadProvider>
      </AssistantActionsContext.Provider>
    </AssistantContext.Provider>
  );
}

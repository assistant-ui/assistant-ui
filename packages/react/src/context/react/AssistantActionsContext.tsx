import { createContext, useContext } from "react";
import { AssistantClientActions } from "../../client/AssistantClient";

export const AssistantActionsContext = createContext<
  AssistantClientActions | undefined
>(undefined);

export const useAssistantActions = () => {
  const context = useContext(AssistantActionsContext);
  if (!context) {
    throw new Error(
      "useAssistantActions must be used within an AssistantProvider",
    );
  }
  return context;
};

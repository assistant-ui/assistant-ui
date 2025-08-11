import { useContext } from "react";
import { AssistantActionsContext } from "./AssistantActionsContext";

export const useAssistantActions = () => {
  const context = useContext(AssistantActionsContext);
  if (!context) {
    throw new Error(
      "useAssistantActionsContext must be used within an AssistantProvider"
    );
  }
  return context;
};

import { createContext } from "react";
import { AssistantActions } from "../../client/types/assistant-types";

export const AssistantActionsContext = createContext<
  AssistantActions | undefined
>(undefined);

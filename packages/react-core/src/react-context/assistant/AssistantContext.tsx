import { createContext } from "react";
import { AssistantClient } from "../../client/AssistantClient";

export const AssistantContext = createContext<AssistantClient | undefined>(
  undefined
);

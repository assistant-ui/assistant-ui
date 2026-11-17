import { createContext, useContext } from "solid-js";
import {
  DefaultAssistantClient,
  type AssistantClient,
  type AssistantClientSource,
} from "@assistant-ui/store/client";

export type AuiContextValue = {
  source: AssistantClientSource;
  aui: AssistantClient;
};

export const defaultContext: AuiContextValue = {
  source: {
    getClient: () => DefaultAssistantClient,
    subscribe: () => () => {},
  },
  aui: DefaultAssistantClient,
};

export const AuiContext = createContext<AuiContextValue>(defaultContext);

export const useAuiContext = (): AuiContextValue => useContext(AuiContext);

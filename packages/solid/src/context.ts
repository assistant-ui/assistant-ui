import { createContext, useContext } from "solid-js";
import {
  DefaultAssistantClient,
  type AssistantClient,
  type AssistantClientSource,
} from "@assistant-ui/store/client";

export type AuiContextValue = {
  source: AssistantClientSource;
  aui: AssistantClient;
  track: () => void;
};

export const defaultContext: AuiContextValue = {
  source: {
    getClient: () => DefaultAssistantClient,
    subscribe: () => () => {},
  },
  aui: DefaultAssistantClient,
  track: () => {},
};

export const AuiContext = createContext<AuiContextValue>(defaultContext);

export const useAuiContext = (): AuiContextValue => useContext(AuiContext);

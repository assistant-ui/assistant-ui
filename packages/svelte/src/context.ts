import { getContext } from "svelte";
import {
  createClientFacade,
  DefaultAssistantClient,
  type AssistantClient,
  type AssistantClientSource,
} from "@assistant-ui/store/client";

export type AuiContext = {
  source: AssistantClientSource;
  aui: AssistantClient;
};

export const auiContextKey: symbol = Symbol("assistant-ui.svelte.aui");

const NO_OP_SUBSCRIBE = () => () => {};

const defaultContext: AuiContext = {
  source: {
    getClient: () => DefaultAssistantClient,
    subscribe: NO_OP_SUBSCRIBE,
  },
  aui: DefaultAssistantClient,
};

export const getAuiContext = (): AuiContext =>
  getContext<AuiContext | undefined>(auiContextKey) ?? defaultContext;

export { createClientFacade };

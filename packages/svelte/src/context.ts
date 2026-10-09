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

/**
 * The scope a builder or `useAuiState` binds to: the surrounding provider by
 * default, or a per-item handle such as a `MessageItem`.
 */
export type ScopeTarget = AuiContext;

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

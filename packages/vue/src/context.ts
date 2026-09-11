import { inject, type InjectionKey } from "vue";
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

export const auiInjectionKey: InjectionKey<AuiContext> = Symbol(
  "assistant-ui.vue.aui",
);

const NO_OP_SUBSCRIBE = () => () => {};

const defaultContext: AuiContext = {
  source: {
    getClient: () => DefaultAssistantClient,
    subscribe: NO_OP_SUBSCRIBE,
  },
  aui: DefaultAssistantClient,
};

export const useAuiContext = (): AuiContext =>
  inject(auiInjectionKey, defaultContext);

export { createClientFacade };

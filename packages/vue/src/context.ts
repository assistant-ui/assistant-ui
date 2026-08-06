import { inject, type InjectionKey } from "vue";
import {
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

// The client object changes identity on structural updates; the facade keeps
// one stable object per provider that always forwards to the current client
export const createClientFacade = (
  source: AssistantClientSource,
): AssistantClient =>
  new Proxy({} as AssistantClient, {
    get: (_target, prop) => Reflect.get(source.getClient(), prop),
    has: (_target, prop) => prop in source.getClient(),
    ownKeys: () => Reflect.ownKeys(source.getClient()),
    getOwnPropertyDescriptor: (_target, prop) => {
      const client = source.getClient();
      if (!(prop in client)) return undefined;
      return {
        configurable: true,
        enumerable: true,
        value: Reflect.get(client, prop),
      };
    },
  });

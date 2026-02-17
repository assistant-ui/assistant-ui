// resources
export { Derived } from "./derived";
export type { DerivedElement } from "./derived";
export { attachTransformScopes } from "./attach-transform-scopes";
export type { ScopesConfig } from "./attach-transform-scopes";

// tap hooks
export {
  tapAssistantClientRef,
  tapAssistantEmit,
} from "./utils/tap-assistant-context";
export { tapClientResource } from "./tap-client-resource";
export { tapClientLookup } from "./tap-client-lookup";
export { tapClientList } from "./tap-client-list";

// types
export type {
  ScopeRegistry,
  ClientOutput,
  AssistantClient,
  AssistantState,
  ClientMethods,
  ClientSchema,
  ClientNames,
  ClientEvents,
  ClientMeta,
  ClientElement,
  Unsubscribe,
  AssistantClientAccessor,
} from "./types/client";
export type {
  AssistantEventName,
  AssistantEventCallback,
  AssistantEventPayload,
  AssistantEventSelector,
  AssistantEventScope,
} from "./types/events";
export { normalizeEventSelector } from "./types/events";

// scopes
export * from "./scopes";

// clients
export * from "./clients";

// utils (re-exported for internal use by @assistant-ui/store)
export {
  BaseProxyHandler,
  handleIntrospectionProp,
} from "./utils/base-proxy-handler";
export {
  SYMBOL_CLIENT_INDEX,
  getClientIndex,
  type ClientStack,
  tapClientStack,
  tapWithClientStack,
} from "./utils/tap-client-stack-context";
export {
  type AssistantTapContextValue,
  withAssistantTapContextProvider,
} from "./utils/tap-assistant-context";
export { NotificationManager } from "./utils/notification-manager";
export {
  PROXIED_ASSISTANT_STATE_SYMBOL,
  createProxiedAssistantState,
  getProxiedAssistantState,
} from "./utils/proxied-assistant-state";
export {
  type RootClients,
  type DerivedClients,
  tapSplitClients,
} from "./utils/split-clients";
export { getClientState, ClientResource } from "./tap-client-resource";
export { wrapperResource } from "./wrapper-resource";
export { getTransformScopes } from "./attach-transform-scopes";

// resources
export { Derived } from "./Derived";
export type { DerivedElement } from "./Derived";
export { attachTransformScopes } from "./attachTransformScopes";
export type { ScopesConfig } from "./attachTransformScopes";

// tap hooks
export {
  tapAssistantClientRef,
  tapAssistantEmit,
} from "./utils/tap-assistant-context";
export { tapClientResource } from "./tapClientResource";
export { tapClientLookup } from "./tapClientLookup";
export { tapClientList } from "./tapClientList";

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

// utils (re-exported for internal use by @assistant-ui/store)
export {
  BaseProxyHandler,
  handleIntrospectionProp,
} from "./utils/BaseProxyHandler";
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
export { NotificationManager } from "./utils/NotificationManager";
export {
  PROXIED_ASSISTANT_STATE_SYMBOL,
  createProxiedAssistantState,
  getProxiedAssistantState,
} from "./utils/proxied-assistant-state";
export {
  type RootClients,
  type DerivedClients,
  tapSplitClients,
} from "./utils/splitClients";
export { getClientState, ClientResource } from "./tapClientResource";
export { wrapperResource } from "./wrapperResource";
export { getTransformScopes } from "./attachTransformScopes";

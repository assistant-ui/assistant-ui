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

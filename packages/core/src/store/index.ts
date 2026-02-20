// resources
export { Derived } from "./utils/derived";
export type { DerivedElement } from "./utils/derived";
export { attachTransformScopes } from "./utils/attach-transform-scopes";
export type { ScopesConfig } from "./utils/attach-transform-scopes";

// tap hooks
export {
  tapAssistantClientRef,
  tapAssistantEmit,
} from "./utils/tap-assistant-context";
export { tapClientResource } from "./utils/tap-client-resource";
export { tapClientLookup } from "./utils/tap-client-lookup";
export { tapClientList } from "./utils/tap-client-list";

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

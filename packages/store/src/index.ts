// hooks
export { useAssistantClient } from "./useAssistantClient";
export { useAssistantState } from "./useAssistantState";
export { useAssistantEvent } from "./useAssistantEvent";

// components
export { AssistantIf } from "./AssistantIf";
export { AssistantProvider } from "./AssistantContext";

// resources
export { DerivedScope } from "./DerivedScope";

// tap hooks
export { tapApiResource, type ApiObject } from "./tapApiResource";
export { tapStoreContext, type StoreContextValue } from "./StoreContext";
export { tapLookupResources } from "./tapLookupResources";
export { tapStoreList, type TapStoreListConfig } from "./tapStoreList";

// registration
export { registerAssistantScope } from "./ScopeRegistry";

// types
export type {
  AssistantScopes,
  AssistantScopeRegistry,
  AssistantClient,
  AssistantState,
  ScopeApi,
} from "./types";

export type {
  AssistantEvent,
  AssistantEventScopeConfig,
  AssistantEventMap,
  AssistantEventScope,
  AssistantEventSelector,
  AssistantEventCallback,
  EventSource,
  SourceByScope,
  EventManager,
} from "./EventContext";

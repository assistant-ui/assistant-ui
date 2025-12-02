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
export { tapApi, type ApiObject } from "./tapApi";
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
} from "./types";

export type {
  AssistantEvent,
  AssistantEventRegistry,
  AssistantEventScopeConfig,
  AssistantEventMap,
  AssistantEventScope,
  AssistantEventSelector,
  AssistantEventCallback,
  EventSource,
  SourceByScope,
  EventManager,
} from "./EventContext";

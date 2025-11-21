export { useAssistantClient } from "./useAssistantClient";
export { useAssistantState } from "./useAssistantState";
export { AssistantProvider } from "./AssistantContext";
export type { AssistantScopes, AssistantClient, AssistantState } from "./types";
export { DerivedScope } from "./DerivedScope";
export type { ApiObject } from "./tapApi";
export { tapApi } from "./tapApi";
export { tapLookupResources } from "./tapLookupResources";
export { tapStoreList } from "./tapStoreList";
export type { TapStoreListConfig } from "./tapStoreList";
export { registerAssistantScope } from "./ScopeRegistry";

export type { AssistantScopeRegistry } from "./types";

// Events & Store Context
export { tapStoreContext } from "./StoreContext";
export type { StoreContextValue } from "./StoreContext";
export { useAssistantEvent } from "./useAssistantEvent";
export { normalizeEventSelector, checkEventScope } from "./EventContext";
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

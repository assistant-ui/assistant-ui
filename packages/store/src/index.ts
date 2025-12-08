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
export { tapAssistantClient, tapEmitEvent } from "./AssistantTapContext";
export { tapClientLookup } from "./tapClientLookup";
export {
  tapClientList,
  type TapClientListConfig,
  type TapClientListResourceProps,
} from "./tapClientList";

// registration
export { registerAssistantScope } from "./ScopeRegistry";

// types
export type {
  AssistantScopes,
  AssistantScopeRegistry,
  AssistantClient,
  AssistantState,
  ScopeOutput,
  ScopeOutputOf,
  ClientObject,
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

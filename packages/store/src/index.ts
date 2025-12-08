// hooks
export { useAssistantClient } from "./useAssistantClient";
export { useAssistantState } from "./useAssistantState";
export { useAssistantEvent } from "./useAssistantEvent";

// components
export { AssistantIf } from "./AssistantIf";
export { AssistantProvider } from "./AssistantContext";

// resources
export { DerivedClient } from "./DerivedClient";

// tap hooks
export { tapAssistantClient, tapEmitEvent } from "./AssistantTapContext";
export { tapClientLookup } from "./tapClientLookup";
export {
  tapClientList,
  type TapClientListProps,
  type TapClientListResourceProps,
} from "./tapClientList";

// registration
export { registerClient } from "./ClientRegistry";

// types
export type {
  AssistantClients,
  AssistantClientRegistry,
  AssistantClient,
  AssistantState,
  ClientOutput,
  ClientOutputOf,
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

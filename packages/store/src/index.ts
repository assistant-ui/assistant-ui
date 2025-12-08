// hooks
export { useAssistantClient } from "./useAssistantClient";
export { useAssistantState } from "./useAssistantState";
export { useAssistantEvent } from "./useAssistantEvent";

// components
export { AssistantIf } from "./AssistantIf";
export { AssistantProvider } from "./utils/react-assistant-context";

// resources
export { Derived } from "./Derived";

// tap hooks
export {
  tapAssistantClient,
  tapEmitClientEvent,
} from "./utils/tap-assistant-context";
export { tapClientLookup } from "./tapClientLookup";
export { tapClientList } from "./tapClientList";

// types
export type { ClientRegistry, ClientResourceOutput } from "./types/client";
export type {
  AssistantEvent,
  AssistantEventCallback,
  AssistantEventSelector,
} from "./types/events";

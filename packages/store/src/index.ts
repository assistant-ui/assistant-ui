// hooks
export { useAui } from "./useAui";
export { useAuiState } from "./useAuiState";
export { useAuiEvent } from "./useAuiEvent";

// components
export { AuiIf } from "./AuiIf";
export { AuiProvider } from "./utils/react-assistant-context";

// resources
export { Derived } from "./Derived";
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
} from "./types/client";
export type {
  AssistantEventName,
  AssistantEventCallback,
  AssistantEventPayload,
  AssistantEventSelector,
  AssistantEventScope,
} from "./types/events";

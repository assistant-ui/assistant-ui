// hooks
export { useAui } from "./useAui";
export { useAuiState } from "./useAuiState";
export { useAuiEvent } from "./useAuiEvent";
export { RenderChildrenWithAccessor } from "./RenderChildrenWithAccessor";

// components
export { AuiIf } from "./AuiIf";
export { AuiProvider } from "./utils/react-assistant-context";

// resources
export { Derived } from "./Derived";
export {
  attachTransformScopes,
  forwardTransformScopes,
} from "./attachTransformScopes";
export type { ScopesConfig } from "./attachTransformScopes";

// client hooks
export {
  useAssistantClientRef,
  useAssistantEmit,
} from "./utils/tap-assistant-context";
export { useClientResource } from "./useClientResource";
export { useClientLookup } from "./useClientLookup";
export { useClientList } from "./useClientList";

// types
export type {
  ScopeRegistry,
  ClientOutput,
  ClientMethods,
  ClientSchema,
  ClientNames,
  ClientEvents,
  ClientMeta,
  ClientElement,
  Unsubscribe,
  AssistantClientAccessor,
  AssistantClient,
  AssistantState,
} from "./types/client";
export {
  normalizeEventSelector,
  type AssistantEventName,
  type AssistantEventCallback,
  type AssistantEventPayload,
  type AssistantEventSelector,
  type AssistantEventScope,
} from "./types/events";

// Backwards-compatible ScopeRegistry augmentation target + forwarding to core
export type { ScopeRegistry } from "./scope-registry";
import "./scope-registry-forward";

// Re-export framework-agnostic infrastructure from core
export {
  Derived,
  attachTransformScopes,
  type ScopesConfig,
  tapAssistantClientRef,
  tapAssistantEmit,
  tapClientResource,
  tapClientLookup,
  tapClientList,
  type ClientOutput,
  type AssistantClient,
  type AssistantState,
  type AssistantEventName,
  type AssistantEventCallback,
  type AssistantEventPayload,
  type AssistantEventSelector,
  type AssistantEventScope,
} from "@assistant-ui/core/store";

// React-specific (stay in store)
export { useAui } from "./useAui";
export { useAuiState } from "./useAuiState";
export { useAuiEvent } from "./useAuiEvent";
export { AuiIf } from "./AuiIf";
export { AuiProvider } from "./utils/react-assistant-context";

export { AuiProvider } from "./AuiProvider";
export { useAui } from "./useAui";
export { useAuiState } from "./useAuiState";
export { useAuiEvent } from "./useAuiEvent";

export { ThreadPrimitiveViewport } from "./primitives/ThreadPrimitiveViewport";
export { ThreadPrimitiveViewportFooter } from "./primitives/ThreadPrimitiveViewportFooter";
export { ThreadPrimitiveScrollToBottom } from "./primitives/ThreadPrimitiveScrollToBottom";
export { useScrollLock } from "./useScrollLock";

export {
  AuiConfig,
  Derived,
  createAssistantClient,
  type AssistantClient,
  type AssistantClientHandle,
  type AssistantClientSource,
  type AssistantConfigSource,
  type AssistantState,
  type AssistantEventCallback,
  type AssistantEventName,
  type AssistantEventSelector,
  type Unsubscribe,
} from "@assistant-ui/store/client";

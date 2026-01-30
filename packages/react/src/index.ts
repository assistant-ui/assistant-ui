import "./types/store-augmentation";

// Re-export from @assistant-ui/store
export {
  useAui,
  AuiProvider,
  useAuiState,
  useAuiEvent,
  AuiIf,
  type AssistantClient,
  type AssistantState,
  type AssistantEventScope,
  type AssistantEventSelector,
  type AssistantEventName,
  type AssistantEventPayload,
  type AssistantEventCallback,
} from "@assistant-ui/store";

export * from "./legacy-runtime/runtime";
export * from "./legacy-runtime/cloud";
export * from "./legacy-runtime/runtime-cores";

export * from "./context";
export * from "./model-context";
export * from "./primitives";
export * from "./types";
export * from "./devtools";
export * from "./client";

export * as INTERNAL from "./internal";
export type { ToolExecutionStatus } from "./internal";

export type { Assistant } from "./augmentations";

// ============================================================================
// Backwards compatibility - deprecated exports
// ============================================================================

/**
 * @deprecated Use `useAui` instead. This alias will be removed in v0.13.
 */
export { useAui as useAssistantApi } from "@assistant-ui/store";

/**
 * @deprecated Use `useAuiState` instead. This alias will be removed in v0.13.
 */
export { useAuiState as useAssistantState } from "@assistant-ui/store";

/**
 * @deprecated Use `useAuiEvent` instead. This alias will be removed in v0.13.
 */
export { useAuiEvent as useAssistantEvent } from "@assistant-ui/store";

/**
 * @deprecated Use `AuiIf` instead. This alias will be removed in v0.13.
 */
export { AuiIf as AssistantIf } from "@assistant-ui/store";

import "./types/store-augmentation";

// Re-export from @assistant-ui/store
export {
  useAssistantClient,
  AssistantProvider,
  useAssistantState,
  useAssistantEvent,
  AssistantIf,
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

export * as INTERNAL from "./internal";
export type { ToolExecutionStatus } from "./internal";

export type { Assistant } from "./augmentations";

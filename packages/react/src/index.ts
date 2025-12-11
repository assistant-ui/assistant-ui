// Re-export additional core types for backward compatibility
// Types that are NOT already exported from ./types can be re-exported here
// Users can also import directly from @assistant-ui/core
export type {
  // Adapters (not exported from react/types)
  AttachmentAdapter,
  SpeechSynthesisAdapter,
  SpeechRecognitionAdapter,
  FeedbackAdapter,
  SuggestionAdapter,
  ThreadSuggestion,
  ThreadHistoryAdapter,
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult,
  // Model Context types (not exported from react/model-context)
  LanguageModelV1CallSettings,
  LanguageModelConfig,
  // Runtime types (not exported from react/runtime-cores)
  ThreadMessageLike,
  // Stream utils
  ReadonlyJSONValue,
  ReadonlyJSONObject,
} from "@assistant-ui/core";

export {
  // Runtime utilities from core
  MessageRepository,
  ExportedMessageRepository,
  fromThreadMessageLike,
  getAutoStatus,
  isAutoStatus,
  // Utils
  generateId,
  generateOptimisticId,
  isOptimisticId,
  getThreadMessageText,
  // Event utils
  normalizeEventSelector,
  checkEventScope,
  // Stream utils
  parsePartialJsonObject,
  getPartialJsonObjectMeta,
  getPartialJsonObjectFieldState,
} from "@assistant-ui/core";

// React-specific exports
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

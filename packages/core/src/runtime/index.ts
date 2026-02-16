// =============================================================================
// Public API — types and values that end users may import
// =============================================================================

// Path Types
export type {
  ThreadListItemRuntimePath,
  ThreadRuntimePath,
  MessageRuntimePath,
  MessagePartRuntimePath,
  AttachmentRuntimePath,
  ComposerRuntimePath,
} from "./paths";

// Runtime Core Interface Types
export type {
  ComposerRuntimeCore,
  ComposerRuntimeEventType,
  DictationState,
  ThreadComposerRuntimeCore,
} from "./composer-runtime-core";

export type {
  RuntimeCapabilities,
  AddToolResultOptions,
  ResumeToolCallOptions,
  SubmitFeedbackOptions,
  ThreadSuggestion,
  SpeechState,
  SubmittedFeedback,
  ThreadRuntimeEventType,
  StartRunConfig,
  ResumeRunConfig,
  ThreadRuntimeCore,
} from "./thread-runtime-core";

export type {
  ThreadListItemStatus,
  ThreadListItemCoreState,
  ThreadListRuntimeCore,
} from "./thread-list-runtime-core";

export type { AssistantRuntimeCore } from "./assistant-runtime-core";

// Public Runtime Types
export type { AssistantRuntime } from "./assistant-runtime";

export type {
  CreateStartRunConfig,
  CreateResumeRunConfig,
  CreateAppendMessage,
  ThreadState,
  ThreadRuntime,
} from "./thread-runtime";

export type { ThreadListState, ThreadListRuntime } from "./thread-list-runtime";

export type {
  ThreadListItemEventType,
  ThreadListItemRuntime,
} from "./thread-list-item-runtime";

export type { ThreadListItemState } from "./bindings";

export type { MessageState, MessageRuntime } from "./message-runtime";
export type {
  MessagePartState,
  MessagePartRuntime,
} from "./message-part-runtime";

export type {
  ThreadComposerState,
  EditComposerState,
  ComposerState,
  ComposerRuntime,
  ThreadComposerRuntime,
  EditComposerRuntime,
} from "./composer-runtime";

export type { AttachmentState, AttachmentRuntime } from "./attachment-runtime";

// Adapters (types + implementations)
export * from "./adapters";

// ChatModel Types
export type {
  ChatModelRunUpdate,
  ChatModelRunResult,
  CoreChatModelRunResult,
  ChatModelRunOptions,
  ChatModelAdapter,
} from "./chat-model-adapter";

// ThreadMessageLike
export type { ThreadMessageLike } from "./thread-message-like";

// External Store Message Utilities
export {
  getExternalStoreMessage,
  getExternalStoreMessages,
} from "./external-store-message";

// ExportedMessageRepository
export type { ExportedMessageRepositoryItem } from "./message-repository";
export { ExportedMessageRepository } from "./message-repository";

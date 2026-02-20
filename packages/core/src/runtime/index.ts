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
} from "./api/paths";

// Runtime Core Interface Types
export type {
  ComposerRuntimeCore,
  ComposerRuntimeEventType,
  DictationState,
  ThreadComposerRuntimeCore,
} from "./interfaces/composer-runtime-core";

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
} from "./interfaces/thread-runtime-core";

export type {
  ThreadListItemStatus,
  ThreadListItemCoreState,
  ThreadListRuntimeCore,
} from "./interfaces/thread-list-runtime-core";

export type { AssistantRuntimeCore } from "./interfaces/assistant-runtime-core";

// Public Runtime Types
export type { AssistantRuntime } from "./api/assistant-runtime";

export type {
  CreateStartRunConfig,
  CreateResumeRunConfig,
  CreateAppendMessage,
  ThreadState,
  ThreadRuntime,
} from "./api/thread-runtime";

export type {
  ThreadListState,
  ThreadListRuntime,
} from "./api/thread-list-runtime";

export type {
  ThreadListItemEventType,
  ThreadListItemRuntime,
} from "./api/thread-list-item-runtime";

export type { ThreadListItemState } from "./api/bindings";

export type { MessageState, MessageRuntime } from "./api/message-runtime";
export type {
  MessagePartState,
  MessagePartRuntime,
} from "./api/message-part-runtime";

export type {
  ThreadComposerState,
  EditComposerState,
  ComposerState,
  ComposerRuntime,
  ThreadComposerRuntime,
  EditComposerRuntime,
} from "./api/composer-runtime";

export type {
  AttachmentState,
  AttachmentRuntime,
} from "./api/attachment-runtime";

// ChatModel Types
export type {
  ChatModelRunUpdate,
  ChatModelRunResult,
  CoreChatModelRunResult,
  ChatModelRunOptions,
  ChatModelAdapter,
} from "./utils/chat-model-adapter";

// ThreadMessageLike
export type { ThreadMessageLike } from "./utils/thread-message-like";

// External Store Message Utilities
export {
  getExternalStoreMessage,
  getExternalStoreMessages,
} from "./utils/external-store-message";

// ExportedMessageRepository
export type { ExportedMessageRepositoryItem } from "./utils/message-repository";
export { ExportedMessageRepository } from "./utils/message-repository";

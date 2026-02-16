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
} from "./core/composer-runtime-core";

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
} from "./core/thread-runtime-core";

export type {
  ThreadListItemStatus,
  ThreadListItemCoreState,
  ThreadListRuntimeCore,
} from "./core/thread-list-runtime-core";

export type { AssistantRuntimeCore } from "./core/assistant-runtime-core";

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

// Adapters (types + implementations)
export * from "./adapters";

// ChatModel Types
export type {
  ChatModelRunUpdate,
  ChatModelRunResult,
  CoreChatModelRunResult,
  ChatModelRunOptions,
  ChatModelAdapter,
} from "./shared/chat-model-adapter";

// ThreadMessageLike
export type { ThreadMessageLike } from "./shared/thread-message-like";

// External Store Message Utilities
export {
  getExternalStoreMessage,
  getExternalStoreMessages,
} from "./shared/external-store-message";

// ExportedMessageRepository
export type { ExportedMessageRepositoryItem } from "./shared/message-repository";
export { ExportedMessageRepository } from "./shared/message-repository";

// Local Runtime Options
export type { LocalRuntimeOptionsBase } from "./local/local-runtime-options";

// External Store Adapter Types (user-facing)
export type {
  ExternalStoreAdapter,
  ExternalStoreMessageConverter,
  ExternalStoreThreadListAdapter,
  ExternalStoreThreadData,
} from "./external-store/external-store-adapter";

// Remote Thread List (user-facing)
export type {
  RemoteThreadListAdapter,
  RemoteThreadListOptions,
  RemoteThreadInitializeResponse,
  RemoteThreadMetadata,
  RemoteThreadListResponse,
} from "./remote-thread-list/types";

export { InMemoryThreadListAdapter } from "./remote-thread-list/adapter/in-memory";

// Assistant Transport Utilities
export {
  toAISDKTools,
  getEnabledTools,
  createRequestHeaders,
} from "./assistant-transport/utils";

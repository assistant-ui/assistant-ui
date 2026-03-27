// @assistant-ui/core - Framework-agnostic core runtime (public API)

// === types ===

export type {
  // Message parts
  TextMessagePart,
  ReasoningMessagePart,
  SourceMessagePart,
  ImageMessagePart,
  FileMessagePart,
  DataMessagePart,
  Unstable_AudioMessagePart,
  ToolCallMessagePart,
  ThreadUserMessagePart,
  ThreadAssistantMessagePart,
  // Message status
  MessagePartStatus,
  ToolCallMessagePartStatus,
  MessageStatus,
  // Thread messages
  MessageTiming,
  ThreadStep,
  ThreadSystemMessage,
  ThreadUserMessage,
  ThreadAssistantMessage,
  ThreadMessage,
  MessageRole,
  // Config
  RunConfig,
  AppendMessage,
} from "./types/message";

export type {
  Attachment,
  PendingAttachment,
  CompleteAttachment,
  AttachmentStatus,
  CreateAttachment,
} from "./types/attachment";

export type { Unsubscribe } from "./types/unsubscribe";

export type { QuoteInfo } from "./types/quote";

export type {
  Unstable_MentionItem,
  Unstable_MentionCategory,
  Unstable_DirectiveSegment,
  Unstable_DirectiveFormatter,
} from "./types/mention";

// === model-context ===

export type {
  // Language model settings
  LanguageModelV1CallSettings,
  LanguageModelConfig,
  // Model context
  ModelContext,
  ModelContextProvider,
  // Tool & instruction config
  AssistantToolProps,
  AssistantInstructionsConfig,
  AssistantContextConfig,
} from "./model-context/types";
export { mergeModelContexts } from "./model-context/types";

export { tool } from "./model-context/tool";

export { ModelContextRegistry } from "./model-context/registry";
export type {
  ModelContextRegistryToolHandle,
  ModelContextRegistryInstructionHandle,
  ModelContextRegistryProviderHandle,
} from "./model-context/registry-handles";

export { AssistantFrameHost } from "./model-context/frame/host";
export { AssistantFrameProvider } from "./model-context/frame/provider";
export type {
  SerializedTool,
  SerializedModelContext,
  FrameMessageType,
  FrameMessage,
} from "./model-context/frame/types";
export { FRAME_MESSAGE_CHANNEL } from "./model-context/frame/types";

// === adapters ===

// Attachment adapters
export type { AttachmentAdapter } from "./adapters/attachment";
export {
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  CompositeAttachmentAdapter,
} from "./adapters/attachment";

// Speech adapters
export type {
  SpeechSynthesisAdapter,
  DictationAdapter,
} from "./adapters/speech";
export {
  WebSpeechSynthesisAdapter,
  WebSpeechDictationAdapter,
} from "./adapters/speech";

// Feedback adapter
export type { FeedbackAdapter } from "./adapters/feedback";

// Suggestion adapter
export type { SuggestionAdapter } from "./adapters/suggestion";

// Mention adapter
export type { Unstable_MentionAdapter } from "./adapters/mention";
export { unstable_defaultDirectiveFormatter } from "./adapters/mention";

// Thread history adapters
export type {
  ThreadHistoryAdapter,
  GenericThreadHistoryAdapter,
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  MessageStorageEntry,
} from "./adapters/thread-history";

// === runtime ===

// Path Types
export type {
  ThreadListItemRuntimePath,
  ThreadRuntimePath,
  MessageRuntimePath,
  MessagePartRuntimePath,
  AttachmentRuntimePath,
  ComposerRuntimePath,
} from "./runtime/api/paths";

// Runtime Core Interface Types
export type {
  ComposerRuntimeCore,
  ComposerRuntimeEventType,
  DictationState,
  ThreadComposerRuntimeCore,
} from "./runtime/interfaces/composer-runtime-core";

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
} from "./runtime/interfaces/thread-runtime-core";

export type {
  ThreadListItemStatus,
  ThreadListItemCoreState,
  ThreadListRuntimeCore,
} from "./runtime/interfaces/thread-list-runtime-core";

export type { AssistantRuntimeCore } from "./runtime/interfaces/assistant-runtime-core";

// Public Runtime Types
export type { AssistantRuntime } from "./runtime/api/assistant-runtime";

export type {
  CreateStartRunConfig,
  CreateResumeRunConfig,
  CreateAppendMessage,
  ThreadState,
  ThreadRuntime,
} from "./runtime/api/thread-runtime";

export type {
  ThreadListState,
  ThreadListRuntime,
} from "./runtime/api/thread-list-runtime";

export type {
  ThreadListItemEventType,
  ThreadListItemRuntime,
} from "./runtime/api/thread-list-item-runtime";

export type { ThreadListItemState } from "./runtime/api/bindings";

export type {
  MessageState,
  MessageRuntime,
} from "./runtime/api/message-runtime";
export type {
  MessagePartState,
  MessagePartRuntime,
} from "./runtime/api/message-part-runtime";

export type {
  ThreadComposerState,
  EditComposerState,
  ComposerState,
  ComposerRuntime,
  ThreadComposerRuntime,
  EditComposerRuntime,
} from "./runtime/api/composer-runtime";

export type {
  AttachmentState,
  AttachmentRuntime,
} from "./runtime/api/attachment-runtime";

// ChatModel Types
export type {
  ChatModelRunUpdate,
  ChatModelRunResult,
  CoreChatModelRunResult,
  ChatModelRunOptions,
  ChatModelAdapter,
} from "./runtime/utils/chat-model-adapter";

// ThreadMessageLike
export type { ThreadMessageLike } from "./runtime/utils/thread-message-like";

// External Store Message Utilities
export {
  getExternalStoreMessage,
  getExternalStoreMessages,
  bindExternalStoreMessage,
} from "./runtime/utils/external-store-message";

// ExportedMessageRepository
export type { ExportedMessageRepositoryItem } from "./runtime/utils/message-repository";
export { ExportedMessageRepository } from "./runtime/utils/message-repository";

// === runtimes ===

// Local Runtime Options
export type { LocalRuntimeOptionsBase } from "./runtimes/local/local-runtime-options";

// External Store Adapter Types (user-facing)
export type {
  ExternalStoreAdapter,
  ExternalStoreMessageConverter,
  ExternalStoreThreadListAdapter,
  ExternalStoreThreadData,
} from "./runtimes/external-store/external-store-adapter";

// Remote Thread List (user-facing)
export type {
  RemoteThreadListAdapter,
  RemoteThreadListOptions,
  RemoteThreadInitializeResponse,
  RemoteThreadMetadata,
  RemoteThreadListResponse,
} from "./runtimes/remote-thread-list/types";

export { InMemoryThreadListAdapter } from "./runtimes/remote-thread-list/adapter/in-memory";

// Assistant Transport Utilities
export {
  toAISDKTools,
  getEnabledTools,
  createRequestHeaders,
} from "./runtimes/assistant-transport/utils";

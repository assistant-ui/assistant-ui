// Re-export core types
export type {
  // Message types
  ThreadMessage,
  ThreadUserMessage,
  ThreadAssistantMessage,
  ThreadSystemMessage,
  MessageStatus,
  MessageRole,
  ThreadMessageLike,
  AppendMessage,
  RunConfig,
  // Message parts
  TextMessagePart,
  ReasoningMessagePart,
  ToolCallMessagePart,
  ImageMessagePart,
  ThreadUserMessagePart,
  ThreadAssistantMessagePart,
  // Runtime types
  AssistantRuntime,
  ThreadRuntime,
  MessageRuntime,
  ThreadComposerRuntime,
  EditComposerRuntime,
  ComposerRuntime,
  ThreadListRuntime,
  ThreadListItemRuntime,
  // Runtime core types
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult,
  RuntimeCapabilities,
  // Attachment types
  Attachment,
  PendingAttachment,
  AttachmentRuntime,
  // Other
  Unsubscribe,
} from "@assistant-ui/core";

// Re-export store scope state types
export type {
  ThreadState,
  ThreadsState,
  MessageState,
  ComposerState,
  AttachmentState,
  ThreadListItemState,
} from "@assistant-ui/core/store";

// Store hooks
export {
  useAui,
  useAuiState,
  useAuiEvent,
  AuiProvider,
} from "@assistant-ui/store";

// Context providers and hooks
export {
  AssistantProvider,
  useAssistantRuntime,
  ThreadProvider,
  useThreadRuntime,
  MessageProvider,
  useMessageRuntime,
  ComposerProvider,
  useComposerRuntime,
} from "./context";

// State hooks
export {
  useThread,
  useMessage,
  useComposer,
  useContentPart,
  useThreadList,
} from "./hooks";

// Primitive hooks
export {
  useThreadMessages,
  useThreadIsRunning,
  useThreadIsEmpty,
  useComposerSend,
  useComposerCancel,
  useMessageReload,
  useMessageBranching,
} from "./primitive-hooks";

// Runtime
export { useLocalRuntime, type LocalRuntimeOptions } from "./runtimes";

// Primitives
export * from "./primitives/thread";
export * from "./primitives/composer";
export * from "./primitives/message";
export * from "./primitives/threadList";

// Adapters
export {
  type StorageAdapter,
  createInMemoryStorageAdapter,
  createAsyncStorageAdapter,
  type TitleGenerationAdapter,
  createSimpleTitleAdapter,
} from "./adapters";

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
  ThreadState,
  MessageRuntime,
  MessageState,
  ThreadComposerRuntime,
  ThreadComposerState,
  EditComposerRuntime,
  EditComposerState,
  ComposerRuntime,
  ComposerState,
  ThreadListRuntime,
  ThreadListState,
  ThreadListItemRuntime,
  ThreadListItemState,
  // Runtime core types
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult,
  RuntimeCapabilities,
  // Attachment types
  Attachment,
  PendingAttachment,
  AttachmentRuntime,
  AttachmentState,
  // Other
  Unsubscribe,
} from "@assistant-ui/core";

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
  useRuntimeState,
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

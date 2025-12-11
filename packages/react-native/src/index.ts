// Context providers
export {
  AssistantProvider,
  useAssistantContext,
  useAssistantContextOptional,
  type AssistantProviderProps,
  type AssistantContextValue,
  type AssistantRuntimeState,
  type SubscribableRuntime,
} from "./context/AssistantContext";

export {
  ThreadProvider,
  useThreadContext,
  useThreadContextOptional,
  type ThreadProviderProps,
  type ThreadRuntime,
  type ThreadRuntimeState,
  type ThreadCapabilities,
  type AppendMessage,
} from "./context/ThreadContext";

export {
  MessageProvider,
  useMessageContext,
  useMessageContextOptional,
  type MessageProviderProps,
  type MessageRuntime,
  type MessageRuntimeState,
} from "./context/MessageContext";

export {
  ComposerProvider,
  useComposerContext,
  useComposerContextOptional,
  type ComposerProviderProps,
  type ComposerRuntime,
  type ComposerRuntimeState,
} from "./context/ComposerContext";

export {
  ContentPartProvider,
  useContentPartContext,
  useContentPartContextOptional,
  type ContentPartProviderProps,
  type ContentPartRuntime,
  type ContentPartRuntimeState,
} from "./context/ContentPartContext";

// Hooks
export {
  useRuntimeState,
  useRuntimeStateOptional,
} from "./hooks/useRuntimeState";
export { useThreadRuntime } from "./hooks/useThreadRuntime";
export { useMessageRuntime } from "./hooks/useMessageRuntime";
export { useComposerRuntime } from "./hooks/useComposerRuntime";
export { useContentPartRuntime } from "./hooks/useContentPartRuntime";
export { useThread } from "./hooks/useThread";
export { useMessage } from "./hooks/useMessage";
export { useComposer } from "./hooks/useComposer";
export { useContentPart } from "./hooks/useContentPart";

// Primitive hooks
export { useThreadMessages } from "./primitive-hooks/useThreadMessages";
export { useThreadIsRunning } from "./primitive-hooks/useThreadIsRunning";
export { useThreadIsEmpty } from "./primitive-hooks/useThreadIsEmpty";
export { useComposerSend } from "./primitive-hooks/useComposerSend";
export { useComposerCancel } from "./primitive-hooks/useComposerCancel";
export { useMessageReload } from "./primitive-hooks/useMessageReload";
export { useMessageBranching } from "./primitive-hooks/useMessageBranching";

// Re-export core types
export type {
  Unsubscribe,
  ThreadMessage,
  ThreadUserMessage,
  ThreadAssistantMessage,
  ThreadSystemMessage,
  MessageStatus,
  MessagePartStatus,
  AppendMessage as CoreAppendMessage,
  TextMessagePart,
  ImageMessagePart,
  ToolCallMessagePart,
  ReasoningMessagePart,
  SourceMessagePart,
  FileMessagePart,
  Attachment,
  PendingAttachment,
  CompleteAttachment,
  AttachmentStatus,
  RunConfig,
} from "@assistant-ui/core";

// Re-export core utilities
export {
  MessageRepository,
  ExportedMessageRepository,
  generateId,
  generateOptimisticId,
  isOptimisticId,
  getThreadMessageText,
} from "@assistant-ui/core";

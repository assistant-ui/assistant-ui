// Re-export core types from @assistant-ui/core
export type {
  // Attachment types
  Attachment,
  PendingAttachment,
  CompleteAttachment,
  AttachmentStatus,
  // Message types
  AppendMessage,
  TextMessagePart,
  ReasoningMessagePart,
  SourceMessagePart,
  ImageMessagePart,
  FileMessagePart,
  DataMessagePart,
  Unstable_AudioMessagePart,
  ToolCallMessagePart,
  MessageStatus,
  MessagePartStatus,
  ToolCallMessagePartStatus,
  // Thread message types
  ThreadUserMessagePart,
  ThreadAssistantMessagePart,
  ThreadSystemMessage,
  ThreadAssistantMessage,
  ThreadUserMessage,
  ThreadMessage,
  // Event types
  AssistantEventScope,
  AssistantEventSelector,
  AssistantEvent,
  AssistantEventMap,
  AssistantEventCallback,
  // Utility types
  Unsubscribe,
} from "@assistant-ui/core";

// React-specific component types (cannot be moved to core as they depend on React's ComponentType)
export type {
  EmptyMessagePartComponent,
  EmptyMessagePartProps,
  TextMessagePartComponent,
  TextMessagePartProps,
  ReasoningMessagePartComponent,
  ReasoningMessagePartProps,
  SourceMessagePartComponent,
  SourceMessagePartProps,
  ImageMessagePartComponent,
  ImageMessagePartProps,
  FileMessagePartComponent,
  FileMessagePartProps,
  Unstable_AudioMessagePartComponent,
  Unstable_AudioMessagePartProps,
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
  ReasoningGroupProps,
  ReasoningGroupComponent,
} from "./MessagePartComponentTypes";

// Thread list item types
export type { ThreadListItemStatus } from "../legacy-runtime/runtime/ThreadListItemRuntime";

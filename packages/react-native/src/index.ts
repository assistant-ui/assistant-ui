/// <reference types="@assistant-ui/core/react" />

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
  SourceMessagePart,
  ToolCallMessagePart,
  ImageMessagePart,
  FileMessagePart,
  DataMessagePart,
  Unstable_AudioMessagePart,
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
  CreateAttachment,
  AttachmentRuntime,
  // Adapter types
  AttachmentAdapter,
  ThreadHistoryAdapter,
  FeedbackAdapter,
  SuggestionAdapter,
  // Other
  Unsubscribe,
} from "@assistant-ui/core";

// Re-export core remote thread list types
export type {
  RemoteThreadListAdapter,
  RemoteThreadListOptions,
} from "@assistant-ui/core";
export { InMemoryThreadListAdapter } from "@assistant-ui/core";

// Attachment adapter implementations
export {
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  CompositeAttachmentAdapter,
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

// Store hooks and components
export {
  useAui,
  useAuiState,
  useAuiEvent,
  AuiProvider,
  AuiIf,
  type AssistantClient,
  type AssistantState,
  type AssistantEventScope,
  type AssistantEventSelector,
  type AssistantEventName,
  type AssistantEventPayload,
  type AssistantEventCallback,
} from "@assistant-ui/store";

// Context providers and hooks
export { AssistantRuntimeProvider } from "./context/AssistantContext";

// Runtime
export {
  useLocalRuntime,
  type LocalRuntimeOptions,
} from "./runtimes/useLocalRuntime";
export { useRemoteThreadListRuntime } from "./runtimes/useRemoteThreadListRuntime";

// Primitives
export * as ThreadPrimitive from "./primitives/thread";
export * as ComposerPrimitive from "./primitives/composer";
export * as MessagePrimitive from "./primitives/message";
export * as ThreadListPrimitive from "./primitives/threadList";
export * as ActionBarPrimitive from "./primitives/actionBar";
export * as BranchPickerPrimitive from "./primitives/branchPicker";
export * as AttachmentPrimitive from "./primitives/attachment";
export * as ThreadListItemPrimitive from "./primitives/threadListItem";
export * as ChainOfThoughtPrimitive from "./primitives/chainOfThought";
export * as SuggestionPrimitive from "./primitives/suggestion";
export * as ErrorPrimitive from "./primitives/error";

// Re-export shared providers from core/react
export {
  ThreadListItemByIndexProvider,
  ChainOfThoughtByIndicesProvider,
  MessageByIndexProvider,
  PartByIndexProvider,
  TextMessagePartProvider,
  ChainOfThoughtPartByIndexProvider,
  SuggestionByIndexProvider,
} from "@assistant-ui/core/react";

// Model context, tools & clients (inlined from model-context)
export {
  makeAssistantTool,
  type AssistantTool,
  makeAssistantToolUI,
  type AssistantToolUI,
  makeAssistantDataUI,
  type AssistantDataUI,
  useAssistantTool,
  type AssistantToolProps,
  useAssistantToolUI,
  type AssistantToolUIProps,
  useAssistantDataUI,
  type AssistantDataUIProps,
  useAssistantInstructions,
  useInlineRender,
  type Toolkit,
  type ToolDefinition,
  Tools,
  DataRenderers,
  Interactables,
  useInteractable,
  type UseInteractableConfig,
  type UseInteractableMetadata,
  makeInteractable,
  type InteractableConfig,
  type AssistantInteractable,
} from "@assistant-ui/core/react";

export type {
  ModelContext,
  ModelContextProvider,
  LanguageModelConfig,
  LanguageModelV1CallSettings,
} from "@assistant-ui/core";

export { mergeModelContexts } from "@assistant-ui/core";

export type { Tool } from "assistant-stream";

export { tool } from "@assistant-ui/core";

export { Suggestions, type SuggestionConfig } from "@assistant-ui/core/store";

export { ModelContextRegistry } from "@assistant-ui/core";
export type {
  ModelContextRegistryToolHandle,
  ModelContextRegistryInstructionHandle,
  ModelContextRegistryProviderHandle,
} from "@assistant-ui/core";

// Client (inlined from client)
export { ModelContext as ModelContextClient } from "@assistant-ui/core/store";
export { ChainOfThoughtClient } from "@assistant-ui/core/store";

// Component types (inlined from types)
export type {
  EmptyMessagePartComponent,
  EmptyMessagePartProps,
  TextMessagePartComponent,
  TextMessagePartProps,
  ReasoningMessagePartComponent,
  ReasoningMessagePartProps,
  ReasoningGroupProps,
  ReasoningGroupComponent,
  SourceMessagePartComponent,
  SourceMessagePartProps,
  ImageMessagePartComponent,
  ImageMessagePartProps,
  FileMessagePartComponent,
  FileMessagePartProps,
  Unstable_AudioMessagePartComponent,
  Unstable_AudioMessagePartProps,
  DataMessagePartComponent,
  DataMessagePartProps,
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
} from "@assistant-ui/core/react";

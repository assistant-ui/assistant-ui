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
  ToolModelContentPart,
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
  CompleteAttachment,
  CreateAttachment,
  AttachmentRuntime,
  // Adapter types
  AttachmentAdapter,
  ThreadHistoryAdapter,
  FeedbackAdapter,
  RealtimeVoiceAdapter,
  VoiceSessionControls,
  VoiceSessionHelpers,
  SuggestionAdapter,
  // Checklist types
  ChecklistItemData,
  ChecklistItemStatus,
  ChecklistData,
  // Other
  Unsubscribe,
} from "@assistant-ui/core";

// Re-export core remote thread list types
export type {
  RemoteThreadListAdapter,
  RemoteThreadListOptions,
} from "@assistant-ui/core";
export { InMemoryThreadListAdapter } from "@assistant-ui/core";
export { createVoiceSession } from "@assistant-ui/core";

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
  QueueItemState,
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

// Context providers
export { AssistantRuntimeProvider } from "./context/AssistantContext";
export {
  RuntimeAdapterProvider,
  useRuntimeAdapters,
  type RuntimeAdapters,
} from "@assistant-ui/core/react";

// Runtime
export {
  useLocalRuntime,
  type LocalRuntimeOptions,
} from "./runtimes/useLocalRuntime";
export { useRemoteThreadListRuntime } from "./runtimes/useRemoteThreadListRuntime";
export {
  createFileStorageAdapter,
  type CreateFileStorageAdapterOptions,
} from "./adapters/FileStorage";
export {
  createSimpleTitleAdapter,
  type TitleGenerationAdapter,
} from "@assistant-ui/core/react";

// Primitives
export * as ThreadPrimitive from "./primitives/thread";
export * as ComposerPrimitive from "./primitives/composer";
export * as QueueItemPrimitive from "./primitives/queueItem";
export * as MessagePrimitive from "./primitives/message";
export * as ThreadListPrimitive from "./primitives/threadList";
export * as ActionBarPrimitive from "./primitives/actionBar";
export * as BranchPickerPrimitive from "./primitives/branchPicker";
export * as AttachmentPrimitive from "./primitives/attachment";
export * as ThreadListItemPrimitive from "./primitives/threadListItem";
export * as ChainOfThoughtPrimitive from "./primitives/chainOfThought";
export * as SuggestionPrimitive from "./primitives/suggestion";
export * as ToolCallPrimitive from "./primitives/toolCall";
export * as ErrorPrimitive from "./primitives/error";
export * as DiffPrimitive from "./primitives/diff";
export * as MessagePartPrimitive from "./primitives/messagePart";
export * as LoadingPrimitive from "./primitives/loading";
export * as StatusBarPrimitive from "./primitives/statusBar";
export { DiffView, type DiffViewProps } from "./primitives/diff/DiffView";
export * as ChecklistPrimitive from "./primitives/checklist";
export {
  LiveChecklist,
  type LiveChecklistProps,
} from "./primitives/checklist/LiveChecklist";
export {
  ToolActivityChecklist,
  type ToolActivityChecklistProps,
} from "./primitives/checklist/ToolActivityChecklist";
export {
  DataChecklist,
  ChecklistDataUI,
} from "./primitives/checklist/DataChecklist";

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

// Checklist hook and utilities from core/react
export {
  useToolActivityChecklist,
  mapToolCallToChecklistItem,
  type UseToolActivityChecklistOptions,
} from "@assistant-ui/core/react";

// Model context, tools & clients
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
  useAssistantContext,
  type AssistantContextConfig,
  useInlineRender,
  type Toolkit,
  type ToolDefinition,
  Tools,
  DataRenderers,
  Interactables,
  useAssistantInteractable,
  type AssistantInteractableProps,
  useInteractableState,
  useToolArgsStatus,
  type ToolArgsStatus,
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

// Client exports
export { ModelContext as ModelContextClient } from "@assistant-ui/core/store";
export { ChainOfThoughtClient } from "@assistant-ui/core/store";

// Component types
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

export {
  useVoiceState,
  useVoiceVolume,
  useVoiceControls,
} from "@assistant-ui/core/react";

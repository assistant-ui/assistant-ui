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

// Context providers
export { AssistantRuntimeProvider } from "./context/AssistantContext";

// Runtime
export {
  useLocalRuntime,
  type LocalRuntimeOptions,
} from "./runtimes/useLocalRuntime";
export { useRemoteThreadListRuntime } from "./runtimes/useRemoteThreadListRuntime";

// Primitives — namespace exports (existing API)
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
export * as ToolCallPrimitive from "./primitives/toolCall";
export * as ErrorPrimitive from "./primitives/error";

// Primitives — direct named exports (bundler-safe for Bun compile / tree-shaking)
export {
  Root as ThreadRoot,
  type RootProps as ThreadRootProps,
  Messages as ThreadMessages,
  type MessagesProps as ThreadMessagesProps,
  MessageByIndex as ThreadMessageByIndex,
  Empty as ThreadEmpty,
  type EmptyProps as ThreadEmptyProps,
  If as ThreadIf,
  type IfProps as ThreadIfProps,
  Suggestion as ThreadSuggestion,
  type SuggestionProps as ThreadSuggestionProps,
  Suggestions as ThreadSuggestions,
  SuggestionByIndex as ThreadSuggestionByIndex,
} from "./primitives/thread";

export {
  Root as MessageRoot,
  type RootProps as MessageRootProps,
  Content as MessageContent,
  type ContentProps as MessageContentProps,
  Parts as MessageParts,
  PartByIndex as MessagePartByIndex,
  If as MessageIf,
  type IfProps as MessageIfProps,
  Attachments as MessageAttachments,
  AttachmentByIndex as MessageAttachmentByIndex,
} from "./primitives/message";

export {
  Root as ComposerRoot,
  type RootProps as ComposerRootProps,
  Attachments as ComposerAttachments,
  AttachmentByIndex as ComposerAttachmentByIndex,
  Input as ComposerInput,
  type InputProps as ComposerInputProps,
  Send as ComposerSend,
  type SendProps as ComposerSendProps,
  Cancel as ComposerCancel,
  type CancelProps as ComposerCancelProps,
  AddAttachment as ComposerAddAttachment,
  type AddAttachmentProps as ComposerAddAttachmentProps,
  If as ComposerIf,
} from "./primitives/composer";

export {
  Root as ThreadListRoot,
  type RootProps as ThreadListRootProps,
  Items as ThreadListItems,
  type ItemsProps as ThreadListItemsProps,
  New as ThreadListNew,
  type NewProps as ThreadListNewProps,
} from "./primitives/threadList";

export {
  Copy as ActionBarCopy,
  type CopyProps as ActionBarCopyProps,
  Edit as ActionBarEdit,
  type EditProps as ActionBarEditProps,
  Reload as ActionBarReload,
  type ReloadProps as ActionBarReloadProps,
  FeedbackPositive as ActionBarFeedbackPositive,
  type FeedbackPositiveProps as ActionBarFeedbackPositiveProps,
  FeedbackNegative as ActionBarFeedbackNegative,
  type FeedbackNegativeProps as ActionBarFeedbackNegativeProps,
} from "./primitives/actionBar";

export {
  Previous as BranchPickerPrevious,
  type PreviousProps as BranchPickerPreviousProps,
  Next as BranchPickerNext,
  type NextProps as BranchPickerNextProps,
  Number as BranchPickerNumber,
  type NumberProps as BranchPickerNumberProps,
  Count as BranchPickerCount,
  type CountProps as BranchPickerCountProps,
} from "./primitives/branchPicker";

export {
  Root as AttachmentRoot,
  type RootProps as AttachmentRootProps,
  Name as AttachmentName,
  type NameProps as AttachmentNameProps,
  Thumb as AttachmentThumb,
  type ThumbProps as AttachmentThumbProps,
  Remove as AttachmentRemove,
  type RemoveProps as AttachmentRemoveProps,
} from "./primitives/attachment";

export {
  Root as ThreadListItemRoot,
  type RootProps as ThreadListItemRootProps,
  Title as ThreadListItemTitle,
  Trigger as ThreadListItemTrigger,
  type TriggerProps as ThreadListItemTriggerProps,
  Delete as ThreadListItemDelete,
  type DeleteProps as ThreadListItemDeleteProps,
  Archive as ThreadListItemArchive,
  type ArchiveProps as ThreadListItemArchiveProps,
  Unarchive as ThreadListItemUnarchive,
  type UnarchiveProps as ThreadListItemUnarchiveProps,
} from "./primitives/threadListItem";

export {
  Root as ChainOfThoughtRoot,
  type RootProps as ChainOfThoughtRootProps,
  AccordionTrigger as ChainOfThoughtAccordionTrigger,
  type AccordionTriggerProps as ChainOfThoughtAccordionTriggerProps,
  Parts as ChainOfThoughtParts,
} from "./primitives/chainOfThought";

export {
  Title as SuggestionTitle,
  type TitleProps as SuggestionTitleProps,
  Description as SuggestionDescription,
  type DescriptionProps as SuggestionDescriptionProps,
  Trigger as SuggestionTrigger,
  type TriggerProps as SuggestionTriggerProps,
} from "./primitives/suggestion";

export {
  Fallback as ToolCallFallback,
  type FallbackProps as ToolCallFallbackProps,
  type ToolCallStatus,
} from "./primitives/toolCall";

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
  useInlineRender,
  type Toolkit,
  type ToolDefinition,
  Tools,
  DataRenderers,
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

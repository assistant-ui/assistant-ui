/// <reference types="@assistant-ui/core/react" />

// Re-export from @assistant-ui/store
export {
  useAui,
  AuiProvider,
  useAuiState,
  useAuiEvent,
  AuiIf,
  type AssistantClient,
  type AssistantState,
  type AssistantEventScope,
  type AssistantEventSelector,
  type AssistantEventName,
  type AssistantEventPayload,
  type AssistantEventCallback,
} from "@assistant-ui/store";

// ============================================================================
// legacy-runtime/runtime
// ============================================================================
// Re-export public runtime types from @assistant-ui/core
export type {
  AssistantRuntime,
  ThreadRuntime,
  ThreadState,
  CreateAppendMessage,
  CreateStartRunConfig,
  CreateResumeRunConfig,
  MessageRuntime,
  MessageState,
  MessagePartRuntime,
  MessagePartState,
  ComposerRuntime,
  ThreadComposerRuntime,
  EditComposerRuntime,
  EditComposerState,
  ThreadComposerState,
  ComposerState,
  AttachmentRuntime,
  AttachmentState,
  ThreadListRuntime,
  ThreadListState,
  ThreadListItemRuntime,
  ThreadListItemState,
} from "@assistant-ui/core";

// ============================================================================
// legacy-runtime/cloud
// ============================================================================
export { useCloudThreadListRuntime } from "./legacy-runtime/cloud/useCloudThreadListRuntime";
export { AssistantCloud } from "assistant-cloud";

// ============================================================================
// legacy-runtime/runtime-cores
// ============================================================================

// --- adapters/attachment ---
export type { AttachmentAdapter } from "@assistant-ui/core";
export {
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  CompositeAttachmentAdapter,
} from "@assistant-ui/core";
export { CloudFileAttachmentAdapter } from "./legacy-runtime/runtime-cores/adapters/attachment/CloudFileAttachmentAdapter";

// --- adapters/feedback ---
export type { FeedbackAdapter } from "@assistant-ui/core";

// --- adapters/speech ---
export type {
  SpeechSynthesisAdapter,
  DictationAdapter,
} from "@assistant-ui/core";
export {
  WebSpeechSynthesisAdapter,
  WebSpeechDictationAdapter,
} from "@assistant-ui/core";

// --- adapters/suggestion ---
export type { SuggestionAdapter } from "@assistant-ui/core";

// --- adapters/RuntimeAdapterProvider ---
export {
  RuntimeAdapterProvider,
  useRuntimeAdapters,
  type RuntimeAdapters,
} from "@assistant-ui/core/react";

// --- adapters/thread-history ---
export type {
  ThreadHistoryAdapter,
  GenericThreadHistoryAdapter,
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  MessageStorageEntry,
} from "@assistant-ui/core";

// --- assistant-transport ---
export {
  useAssistantTransportRuntime,
  useAssistantTransportSendCommand,
  useAssistantTransportState,
} from "./legacy-runtime/runtime-cores/assistant-transport/useAssistantTransportRuntime";
export type {
  AssistantTransportConnectionMetadata,
  AssistantTransportCommand,
  AssistantTransportProtocol,
  SendCommandsRequestBody,
} from "./legacy-runtime/runtime-cores/assistant-transport/types";

// --- core ---
export type {
  AddToolResultOptions,
  SubmitFeedbackOptions,
  ThreadSuggestion,
  DictationState,
} from "@assistant-ui/core";

// --- external-store ---
export type { ThreadMessageLike } from "@assistant-ui/core";
export {
  getExternalStoreMessage,
  getExternalStoreMessages,
  bindExternalStoreMessage,
} from "@assistant-ui/core";
export type {
  ExternalStoreAdapter,
  ExternalStoreMessageConverter,
  ExternalStoreThreadListAdapter,
  ExternalStoreThreadData,
} from "@assistant-ui/core";
export { useExternalStoreRuntime } from "./legacy-runtime/runtime-cores/external-store/useExternalStoreRuntime";
export {
  useExternalMessageConverter,
  convertExternalMessages as unstable_convertExternalMessages,
} from "./legacy-runtime/runtime-cores/external-store/external-message-converter";
export { createMessageConverter as unstable_createMessageConverter } from "./legacy-runtime/runtime-cores/external-store/createMessageConverter";

// --- local ---
export type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult,
  ChatModelRunUpdate,
  LocalRuntimeOptionsBase,
} from "@assistant-ui/core";
export { useLocalRuntime } from "./legacy-runtime/runtime-cores/local/useLocalRuntime";
/**
 * @deprecated Use `useLocalRuntime` instead.
 */
export { useLocalRuntime as useLocalThreadRuntime } from "./legacy-runtime/runtime-cores/local/useLocalRuntime";
export type { LocalRuntimeOptions } from "./legacy-runtime/runtime-cores/local/LocalRuntimeOptions";

// --- remote-thread-list ---
export { useRemoteThreadListRuntime } from "./legacy-runtime/runtime-cores/remote-thread-list/useRemoteThreadListRuntime";
/** @deprecated Use `useRemoteThreadListRuntime` instead. */
export { useRemoteThreadListRuntime as unstable_useRemoteThreadListRuntime } from "./legacy-runtime/runtime-cores/remote-thread-list/useRemoteThreadListRuntime";
export { useCloudThreadListAdapter } from "./legacy-runtime/runtime-cores/remote-thread-list/adapter/cloud";
/** @deprecated Use `useCloudThreadListAdapter` instead. */
export { useCloudThreadListAdapter as unstable_useCloudThreadListAdapter } from "./legacy-runtime/runtime-cores/remote-thread-list/adapter/cloud";
export type { RemoteThreadListAdapter } from "@assistant-ui/core";
/** @deprecated Use `RemoteThreadListAdapter` instead. */
export type { RemoteThreadListAdapter as unstable_RemoteThreadListAdapter } from "@assistant-ui/core";
export { InMemoryThreadListAdapter } from "@assistant-ui/core";
/** @deprecated Use `InMemoryThreadListAdapter` instead. */
export { InMemoryThreadListAdapter as unstable_InMemoryThreadListAdapter } from "@assistant-ui/core";

// Re-export from @assistant-ui/core (runtime-cores root)
export type { ExportedMessageRepositoryItem } from "@assistant-ui/core";
export { ExportedMessageRepository } from "@assistant-ui/core";

// ============================================================================
// context
// ============================================================================
export * from "./context";

// ============================================================================
// model-context
// ============================================================================
// Re-export shared from core/react
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

// Core pass-through (unchanged)
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
export type {
  QueueItemState,
  QueueItemMethods,
} from "@assistant-ui/core/store";
export type { ComposerSendOptions } from "@assistant-ui/core/store";

// React-only (stays)
export { makeAssistantVisible } from "./model-context/makeAssistantVisible";

// --- model-context/registry ---
export { ModelContextRegistry } from "@assistant-ui/core";
export type {
  ModelContextRegistryToolHandle,
  ModelContextRegistryInstructionHandle,
  ModelContextRegistryProviderHandle,
} from "@assistant-ui/core";

// --- model-context/frame ---
export { AssistantFrameHost } from "@assistant-ui/core";
export { AssistantFrameProvider } from "@assistant-ui/core";
export type {
  SerializedTool,
  SerializedModelContext,
  FrameMessageType,
  FrameMessage,
} from "@assistant-ui/core";
export { FRAME_MESSAGE_CHANNEL } from "@assistant-ui/core";
export { useAssistantFrameHost } from "./model-context/frame/useAssistantFrameHost";

// ============================================================================
// primitives
// ============================================================================
export * as ActionBarPrimitive from "./primitives/actionBar";
export * as ActionBarMorePrimitive from "./primitives/actionBarMore";
export * as AssistantModalPrimitive from "./primitives/assistantModal";
export * as AttachmentPrimitive from "./primitives/attachment";
export * as BranchPickerPrimitive from "./primitives/branchPicker";
export * as ChainOfThoughtPrimitive from "./primitives/chainOfThought";
export * as ComposerPrimitive from "./primitives/composer";
export * as QueueItemPrimitive from "./primitives/queueItem";
export * as MessagePartPrimitive from "./primitives/messagePart";
export * as ErrorPrimitive from "./primitives/error";
export * as MessagePrimitive from "./primitives/message";
export * as ThreadPrimitive from "./primitives/thread";
export * as SuggestionPrimitive from "./primitives/suggestion";
export * as ThreadListPrimitive from "./primitives/threadList";
export * as ThreadListItemPrimitive from "./primitives/threadListItem";
export * as ThreadListItemMorePrimitive from "./primitives/threadListItemMore";
export * as SelectionToolbarPrimitive from "./primitives/selectionToolbar";

export { useMessagePartText } from "./primitives/messagePart/useMessagePartText";
export { useMessagePartReasoning } from "./primitives/messagePart/useMessagePartReasoning";
export { useMessagePartSource } from "./primitives/messagePart/useMessagePartSource";
export { useMessagePartFile } from "./primitives/messagePart/useMessagePartFile";
export { useMessagePartImage } from "./primitives/messagePart/useMessagePartImage";
export { useMessagePartData } from "./primitives/messagePart/useMessagePartData";
export { useThreadViewportAutoScroll } from "./primitives/thread/useThreadViewportAutoScroll";
export { useScrollLock } from "./primitives/reasoning/useScrollLock";
export { useMessageQuote } from "./hooks/useMessageQuote";
export { useMessageTiming } from "./hooks/useMessageTiming";

// ============================================================================
// types
// ============================================================================
// Re-export core types from @assistant-ui/core
export type {
  Attachment,
  PendingAttachment,
  CompleteAttachment,
  AttachmentStatus,
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
  MessageTiming,
  ThreadUserMessagePart,
  ThreadAssistantMessagePart,
  ThreadSystemMessage,
  ThreadAssistantMessage,
  ThreadUserMessage,
  ThreadMessage,
  Unsubscribe,
  QuoteInfo,
  CreateAttachment,
} from "@assistant-ui/core";

// React component types (from core/react)
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
  DataMessagePartComponent,
  DataMessagePartProps,
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
  ReasoningGroupProps,
  ReasoningGroupComponent,
  QuoteMessagePartComponent,
  QuoteMessagePartProps,
} from "@assistant-ui/core/react";

// Thread list item types
export type { ThreadListItemStatus } from "@assistant-ui/core";

// ============================================================================
// devtools
// ============================================================================
export { DevToolsHooks, DevToolsProviderApi } from "./devtools/DevToolsHooks";

// ============================================================================
// client
// ============================================================================
// Note: Tools, DataRenderers, Suggestions, SuggestionConfig already exported above from model-context
export { ModelContext as ModelContextClient } from "@assistant-ui/core/store";
export { ChainOfThoughtClient } from "@assistant-ui/core/store";
export {
  ExternalThread,
  type ExternalThreadProps,
  type ExternalThreadMessage,
  type ExternalThreadQueueAdapter,
} from "./client/ExternalThread";
export {
  InMemoryThreadList,
  type InMemoryThreadListProps,
} from "./client/InMemoryThreadList";
export { SingleThreadList } from "./client/SingleThreadList";

// ============================================================================
// internal & augmentations
// ============================================================================
export * as INTERNAL from "./internal";

// Unstable - mention
export {
  unstable_useToolMentionAdapter,
  type Unstable_ToolMentionAdapterOptions,
} from "./unstable/useToolMentionAdapter";
export {
  useMentionContext as unstable_useMentionContext,
  useMentionContextOptional as unstable_useMentionContextOptional,
  useMentionInternalContext as unstable_useMentionInternalContext,
} from "./primitives/composer/mention";
export type { ToolExecutionStatus } from "./internal";

export type { Assistant } from "./augmentations";

// ============================================================================
// Backwards compatibility - deprecated exports
// ============================================================================

/**
 * @deprecated Use `useAui` instead. This alias will be removed in v0.13.
 */
export { useAui as useAssistantApi } from "@assistant-ui/store";

/**
 * @deprecated Use `useAuiState` instead. This alias will be removed in v0.13.
 */
export { useAuiState as useAssistantState } from "@assistant-ui/store";

/**
 * @deprecated Use `useAuiEvent` instead. This alias will be removed in v0.13.
 */
export { useAuiEvent as useAssistantEvent } from "@assistant-ui/store";

/**
 * @deprecated Use `AuiIf` instead. This alias will be removed in v0.13.
 */
export { AuiIf as AssistantIf } from "@assistant-ui/store";

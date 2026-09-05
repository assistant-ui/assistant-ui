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
  RespondToToolApprovalOptions,
  ToolApprovalDisplay,
  ToolApprovalOption,
  ToolApprovalOptionKind,
  ToolApprovalResponse,
  ToolCallMessagePart,
  ToolCallTiming,
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
  SuggestionAdapterGenerateOptions,
  CreateSuggestionAdapterOptions,
  // Other
  Unsubscribe,
} from "@assistant-ui/core";

// Re-export core remote thread list types
export type {
  RemoteThreadListAdapter,
  RemoteThreadListOptions,
  RemoteThreadListProviderComponent,
} from "@assistant-ui/core";
export { InMemoryThreadListAdapter } from "@assistant-ui/core";
export {
  createVoiceSession,
  toolApprovalAcceptsText,
} from "@assistant-ui/core";
export { fromThreadMessageLike, generateId } from "@assistant-ui/core";
export { createSuggestionAdapter } from "@assistant-ui/core";

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
  AuiConfig,
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
export * as ErrorPrimitive from "./primitives/error";

export { groupPartByType, type GroupByContext } from "@assistant-ui/core/react";
export { unstable_useThreadMessageIds } from "@assistant-ui/core/react";

// Re-export shared providers from core/react
export {
  ThreadListItemByIndexProvider,
  ThreadListItemRuntimeProvider,
  ChainOfThoughtByIndicesProvider,
  MessageByIndexProvider,
  MessageAttachmentByIndexProvider,
  ComposerAttachmentByIndexProvider,
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
  useAssistantContext,
  type AssistantContextConfig,
  useInlineRender,
  type Toolkit,
  type ToolDefinition,
  type ToolkitDefinition,
  type ToolkitDefinitionEntry,
  type ToolCallText,
  defineToolkit,
  stubTool,
  externalTool,
  /**
   * @deprecated Experimental since 2026-06-03, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  useAuiToolOverrides,
  hitl,
  hitlTool,
  humanTool,
  providerTool,
  type ProviderToolConfig,
  defineMcpToolkit,
  type McpToolkitEntry,
  type McpToolkitDefinition,
  type McpToolkitToolConfig,
  Tools,
  DataRenderers,
  Interactables,
  useAssistantInteractable,
  type AssistantInteractableProps,
  useInteractableState,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  unstable_Interactables,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  unstable_useInteractable,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableConfig,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InferInteractableState,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableVersionInfo,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  unstable_useInteractableState,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  unstable_useInteractableVersions,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  unstable_interactableTool,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableToolConfig,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableToolRenderProps,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableStateSchema,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractablesState,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableDefinition,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableRegistration,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractablesMethods,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractablePersistedState,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractablePersistenceAdapter,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractablePersistenceStatus,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractablesClientSchema,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractablesConfig,
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

export {
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  unstable_getInteractableSnapshots,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  unstable_formatInteractableSnapshot,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  unstable_getInteractableVersions,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableSnapshotEntry,
  /**
   * @deprecated Experimental since 2026-06-23, extended 2027-09-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableVersion,
} from "@assistant-ui/core";

export type { ExportedMessageRepositoryItem } from "@assistant-ui/core";
export { ExportedMessageRepository } from "@assistant-ui/core";

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

export {
  useVoiceState,
  useVoiceVolume,
  useVoiceControls,
} from "@assistant-ui/core/react";

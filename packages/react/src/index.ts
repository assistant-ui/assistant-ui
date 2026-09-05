/// <reference types="@assistant-ui/core/react" />

// Re-export from @assistant-ui/store
export {
  useAui,
  AuiProvider,
  AuiConfig,
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

export { toolApprovalAcceptsText } from "@assistant-ui/core";

export { useCloudThreadListRuntime } from "@assistant-ui/core/react";
export { AssistantCloud, readAnonymousRefreshToken } from "assistant-cloud";

// --- adapters/attachment ---
export type { AttachmentAdapter } from "@assistant-ui/core";
export {
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  CompositeAttachmentAdapter,
} from "@assistant-ui/core";
export { CloudFileAttachmentAdapter } from "./legacy-runtime/runtime-cores/adapters/attachment/CloudFileAttachmentAdapter";

// --- adapters/voice ---
export type { RealtimeVoiceAdapter } from "@assistant-ui/core";
export { createVoiceSession } from "@assistant-ui/core";
export type {
  VoiceSessionControls,
  VoiceSessionHelpers,
  VoiceSessionState,
} from "@assistant-ui/core";
export {
  useVoiceState,
  useVoiceVolume,
  useVoiceControls,
} from "@assistant-ui/core/react";

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
export type {
  SuggestionAdapter,
  SuggestionAdapterGenerateOptions,
  CreateSuggestionAdapterOptions,
} from "@assistant-ui/core";
export { createSuggestionAdapter } from "@assistant-ui/core";

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
} from "./assistant-transport";
export type {
  AssistantTransportConnectionMetadata,
  AssistantTransportCommand,
  AssistantTransportProtocol,
  SendCommandsRequestBody,
} from "./assistant-transport";

// --- core ---
export type {
  AddToolResultOptions,
  SubmitFeedbackOptions,
  ThreadSuggestion,
  DictationState,
} from "@assistant-ui/core";

// --- external-store ---
export type { ThreadMessageLike } from "@assistant-ui/core";
export { fromThreadMessageLike, generateId } from "@assistant-ui/core";
export {
  /**
   * @deprecated Experimental since 2025-01-24, extended 2027-03-05. Not scheduled for removal; the API may change in any release.
   */
  getExternalStoreMessages,
  bindExternalStoreMessage,
  pickExternalStoreSharedOptions,
} from "@assistant-ui/core";
export type {
  ExternalStoreAdapter,
  ExternalStoreMessageConverter,
  ExternalStoreSharedOptions,
  ExternalStoreThreadListAdapter,
  ExternalStoreThreadData,
  ExternalStoreBranchChange,
} from "@assistant-ui/core";
export { MessageNotSentError, isMessageNotSentError } from "@assistant-ui/core";
export {
  createMessageQueue,
  type MessageQueueDriver,
  type MessageQueueController,
  type ExternalThreadQueueAdapter,
  type ExternalThreadBranchAdapter,
} from "@assistant-ui/core";
export { useExternalStoreRuntime } from "./legacy-runtime/runtime-cores/external-store/useExternalStoreRuntime";
export { useExternalStoreSharedOptions } from "@assistant-ui/core/react";
export {
  useExternalMessageConverter,
  /**
   * @deprecated Experimental since 2025-01-26, extended 2027-03-05. Not scheduled for removal; the API may change in any release.
   */
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
export type { LocalRuntimeOptions } from "./legacy-runtime/runtime-cores/local/LocalRuntimeOptions";

// --- remote-thread-list ---
export { useRemoteThreadListRuntime } from "./legacy-runtime/runtime-cores/remote-thread-list/useRemoteThreadListRuntime";
export { useCloudThreadListAdapter } from "./legacy-runtime/runtime-cores/remote-thread-list/adapter/cloud";
export type {
  RemoteThreadListAdapter,
  RemoteThreadListProviderComponent,
} from "@assistant-ui/core";
export { InMemoryThreadListAdapter } from "@assistant-ui/core";

// Re-export from @assistant-ui/core (runtime-cores root)
export type { ExportedMessageRepositoryItem } from "@assistant-ui/core";
export { ExportedMessageRepository } from "@assistant-ui/core";

export * from "./context";

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
  useAssistantContext,
  type AssistantContextConfig,
  useInlineRender,
  type Toolkit,
  type ToolDefinition,
  type ToolCallText,
  type ToolkitDefinition,
  type ToolkitDefinitionEntry,
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
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  unstable_Interactables,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  unstable_useInteractable,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableConfig,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InferInteractableState,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableVersionInfo,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  unstable_useInteractableState,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  unstable_useInteractableVersions,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  unstable_interactableTool,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableToolConfig,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableToolRenderProps,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableStateSchema,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractablesState,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableDefinition,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableRegistration,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractablesMethods,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractablePersistedState,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractablePersistenceAdapter,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractablePersistenceStatus,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractablesClientSchema,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
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
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  unstable_getInteractableSnapshots,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  unstable_formatInteractableSnapshot,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  unstable_getInteractableVersions,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableSnapshotEntry,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_InteractableVersion,
} from "@assistant-ui/core";

export type { Tool } from "assistant-stream";

export { tool } from "@assistant-ui/core";

export { Suggestions, type SuggestionConfig } from "@assistant-ui/core/store";
export type {
  QueueItemState,
  QueueItemMethods,
} from "@assistant-ui/core/store";
export type { ComposerSendOptions } from "@assistant-ui/core/store";

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

export { groupPartByType, type GroupByContext } from "@assistant-ui/core/react";
export { unstable_useThreadMessageIds } from "@assistant-ui/core/react";
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
export { useToolCallElapsed } from "./hooks/useToolCallElapsed";
export {
  /**
   * @deprecated Experimental since 2026-06-13. Not scheduled for removal; the API may change in any release.
   */
  unstable_useMessageStallDetection,
  /**
   * @deprecated Experimental since 2026-06-13. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_MessageStallDetection,
  /**
   * @deprecated Experimental since 2026-06-13. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_MessageStallDetectionOptions,
} from "./unstable/useMessageStallDetection";
export { useSmooth, type SmoothOptions } from "./utils/smooth/useSmooth";

// Re-export core types from @assistant-ui/core
export type {
  Attachment,
  PendingAttachment,
  CompleteAttachment,
  AttachmentStatus,
  AppendMessage,
  TextMessagePart,
  ReasoningMessagePart,
  PartProviderMetadata,
  SourceProviderMetadata,
  SourceMessagePart,
  ImageMessagePart,
  FileMessagePart,
  DataMessagePart,
  GenerativeUIMessagePart,
  GenerativeUINode,
  GenerativeUISpec,
  /**
   * @deprecated Experimental since 2025-06-26, extended 2027-03-05. Not scheduled for removal; the API may change in any release.
   */
  Unstable_AudioMessagePart,
  RespondToToolApprovalOptions,
  ToolApprovalDisplay,
  ToolApprovalOption,
  ToolApprovalOptionKind,
  ToolApprovalResponse,
  ToolCallMessagePart,
  ToolCallTiming,
  ToolModelContentPart,
  MessageStatus,
  MessagePartStatus,
  MessagePartStreamStatus,
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
  /**
   * @deprecated Experimental since 2025-06-26, extended 2027-03-05. Not scheduled for removal; the API may change in any release.
   */
  Unstable_AudioMessagePartComponent,
  /**
   * @deprecated Experimental since 2025-06-26, extended 2027-03-05. Not scheduled for removal; the API may change in any release.
   */
  Unstable_AudioMessagePartProps,
  DataMessagePartComponent,
  DataMessagePartProps,
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
  ReasoningGroupProps,
  ReasoningGroupComponent,
  QuoteMessagePartComponent,
  QuoteMessagePartProps,
  GenerativeUIComponentRegistry,
  GenerativeUIMessagePartComponent,
  GenerativeUIMessagePartProps,
  GenerativeUIRenderProps,
  EnrichedPartState,
  PartState,
} from "@assistant-ui/core/react";

// Generative UI runtime error + headless renderer (re-exported from core)
export {
  GenerativeUIRender,
  GenerativeUIRenderError,
} from "@assistant-ui/core/react";

// Thread list item types
export type { ThreadListItemStatus } from "@assistant-ui/core";

export { DevToolsHooks, DevToolsProviderApi } from "./devtools/DevToolsHooks";

export { ModelContext as ModelContextClient } from "@assistant-ui/core/store";
export { ChainOfThoughtClient } from "@assistant-ui/core/store";
export {
  ExternalThread,
  type ExternalThreadProps,
  type ExternalThreadMessage,
} from "@assistant-ui/core/store";
export {
  InMemoryThreadList,
  type InMemoryThreadListProps,
} from "@assistant-ui/core/store";
export {
  RemoteThreadList,
  type RemoteThreadListProps,
} from "@assistant-ui/core/store";
export { SingleThreadList } from "@assistant-ui/core/store";

export * as INTERNAL from "./internal";

// Unstable - mention adapter helper (tools + custom items + categories)
export {
  /**
   * @deprecated Experimental since 2026-04-15, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  unstable_useMentionAdapter,
  /**
   * @deprecated Experimental since 2026-04-15, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_IconComponent,
  /**
   * @deprecated Experimental since 2026-03-16, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_Mention,
  /**
   * @deprecated Experimental since 2026-03-16, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_MentionCategory,
  /**
   * @deprecated Experimental since 2026-04-15, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_MentionDirective,
  /**
   * @deprecated Experimental since 2026-04-15, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_ModelContextToolsOptions,
  /**
   * @deprecated Experimental since 2026-04-15, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_UseMentionAdapterOptions,
} from "./unstable/useMentionAdapter";

// Unstable - slash command adapter helper
export {
  /**
   * @deprecated Experimental since 2026-04-06, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  unstable_useSlashCommandAdapter,
  /**
   * @deprecated Experimental since 2026-04-06, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_SlashCommand,
  /**
   * @deprecated Experimental since 2026-04-15, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_SlashCommandAction,
  /**
   * @deprecated Experimental since 2026-04-06, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_UseSlashCommandAdapterOptions,
} from "./unstable/useSlashCommandAdapter";

// Unstable - live (async) completion adapter helper
export {
  /**
   * @deprecated Experimental since 2026-06-15. Not scheduled for removal; the API may change in any release.
   */
  unstable_useLiveCompletionAdapter,
  /**
   * @deprecated Experimental since 2026-06-15. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_UseLiveCompletionAdapterOptions,
} from "./unstable/useLiveCompletionAdapter";

export type { ToolExecutionStatus } from "./internal";

// Unstable - trigger popover (unified root for @ mentions, / slash commands, etc.)
export {
  /**
   * @deprecated Experimental since 2026-04-15, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  useTriggerPopoverRootContext as unstable_useTriggerPopoverRootContext,
  /**
   * @deprecated Experimental since 2026-04-15, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  useTriggerPopoverRootContextOptional as unstable_useTriggerPopoverRootContextOptional,
  /**
   * @deprecated Experimental since 2026-04-15, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  useTriggerPopoverScopeContext as unstable_useTriggerPopoverScopeContext,
  /**
   * @deprecated Experimental since 2026-04-15, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  useTriggerPopoverScopeContextOptional as unstable_useTriggerPopoverScopeContextOptional,
  /**
   * @deprecated Experimental since 2026-04-15, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  useTriggerPopoverTriggers as unstable_useTriggerPopoverTriggers,
  /**
   * @deprecated Experimental since 2026-04-15, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  useTriggerPopoverTriggersOptional as unstable_useTriggerPopoverTriggersOptional,
  /**
   * @deprecated Experimental since 2026-04-15, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  type RegisteredTrigger as Unstable_RegisteredTrigger,
  /**
   * @deprecated Experimental since 2026-08-25. Not scheduled for removal; the API may change in any release.
   */
  type TriggerMatch as Unstable_TriggerMatch,
  /**
   * @deprecated Experimental since 2026-08-25. Not scheduled for removal; the API may change in any release.
   */
  type TriggerMatcher as Unstable_TriggerMatcher,
  /**
   * @deprecated Experimental since 2026-04-15, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  type TriggerBehavior as Unstable_TriggerBehavior,
} from "./primitives/composer/trigger";
export type {
  /**
   * @deprecated Experimental since 2026-03-16, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  Unstable_DirectiveFormatter,
  /**
   * @deprecated Experimental since 2026-03-16, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  Unstable_DirectiveSegment,
  /**
   * @deprecated Experimental since 2026-04-06, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  Unstable_TriggerItem,
} from "@assistant-ui/core";
export { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";

// Unstable - composer input history (terminal-style ArrowUp/ArrowDown recall)
export {
  /**
   * @deprecated Experimental since 2026-06-11. Not scheduled for removal; the API may change in any release.
   */
  unstable_useComposerInputHistory,
  /**
   * @deprecated Experimental since 2026-06-11. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_ComposerInputHistory,
} from "./unstable/useComposerInputHistory";

// Unstable - headless composer input bridge (value/send without ComposerPrimitive.Input)
export {
  /**
   * @deprecated Experimental since 2026-06-11. Not scheduled for removal; the API may change in any release.
   */
  unstable_useComposerInput,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  unstable_useTriggerPopoverAriaProps,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_UseComposerInputOptions,
  /**
   * @deprecated Experimental since 2026-06-11. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_ComposerInput,
  /**
   * @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_TriggerPopoverAriaProps,
} from "./unstable/useComposerInput";

export type { Assistant } from "./augmentations";

// --- mcp-apps ---
export {
  McpAppRenderer,
  McpAppsRemoteHost,
  getMcpAppFromToolPart,
} from "./mcp-apps";
export type {
  McpAppPartOptions,
  McpAppRendererOptions,
  McpAppMetadata,
  McpAppResource,
  McpAppResourceMeta,
  McpAppResourceCSP,
  McpAppSandboxConfig,
  McpAppHostInfo,
  McpAppHostContext,
  McpAppDisplayMode,
  McpAppsHost,
  McpAppsRemoteHostOptions,
  McpAppToolCallParams,
  McpAppBridgeHandlers,
  ToolCallMessagePartMcpMetadata,
} from "./mcp-apps";
export type { McpAppResourceOutput } from "@assistant-ui/core/react";
export type { ShimLoadError, ShimLoadErrorCode } from "safe-content-frame";

// Unstable - WebMCP provider (exposes frontend tools to a WebMCP-capable browser)
export {
  /**
   * @deprecated Experimental since 2026-08-29. Not scheduled for removal; the API may change in any release.
   */
  unstable_useWebMcpProvider,
  /**
   * @deprecated Experimental since 2026-08-29. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_WebMcpProviderOptions,
  /**
   * @deprecated Experimental since 2026-08-29. Not scheduled for removal; the API may change in any release.
   */
  type Unstable_WebMcpProviderResult,
} from "./unstable/webmcp/useWebMcpProvider";
export { defaultWebMcpFilter as unstable_defaultWebMcpFilter } from "./unstable/webmcp/convertTools";

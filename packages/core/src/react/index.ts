/// <reference path="../store/scope-registration.ts" />
/// <reference path="./types/store-augmentation.ts" />

// model-context
export {
  makeAssistantTool,
  type AssistantTool,
} from "./model-context/makeAssistantTool";
export {
  type AssistantToolUI,
  makeAssistantToolUI,
} from "./model-context/makeAssistantToolUI";
export {
  type AssistantDataUI,
  makeAssistantDataUI,
} from "./model-context/makeAssistantDataUI";
export { useAssistantInstructions } from "./model-context/useAssistantInstructions";
export {
  useAssistantContext,
  type AssistantContextConfig,
} from "./model-context/useAssistantContext";
export {
  useAssistantTool,
  type AssistantToolProps,
} from "./model-context/useAssistantTool";
export {
  useAssistantToolUI,
  type AssistantToolUIProps,
} from "./model-context/useAssistantToolUI";
export {
  useAssistantDataUI,
  type AssistantDataUIProps,
} from "./model-context/useAssistantDataUI";
export { useInlineRender } from "./model-context/useInlineRender";
export {
  type Toolkit,
  type ToolDefinition,
  type ToolkitDefinition,
  type ToolkitDefinitionEntry,
  type ToolCallText,
} from "./model-context/toolbox";
export { defineToolkit } from "./model-context/define-toolkit";
export { stubTool } from "./model-context/stub-tool";
export { externalTool } from "./model-context/external-tool";
export { useAuiToolOverrides } from "./model-context/useAuiToolOverrides";
export { hitl, hitlTool, humanTool } from "./model-context/human-tool";
export {
  providerTool,
  type ProviderToolConfig,
} from "./model-context/provider-tool";
export {
  defineMcpToolkit,
  type McpToolkitDefinition,
} from "./model-context/define-mcp-toolkit";
/**
 * @deprecated Since 2026-06-14 — migrate to the Unstable / Experimental API.
 * Scheduled for removal on/after 2026-09-14. See
 * {@link https://www.assistant-ui.com/docs/tools/interactables#migrating-from-the-previous-api | Interactables migration guide}.
 */
export {
  useAssistantInteractable,
  type AssistantInteractableProps,
} from "./interactables-legacy/useAssistantInteractable";
/**
 * @deprecated Since 2026-06-14 — migrate to the Unstable / Experimental API.
 * Scheduled for removal on/after 2026-09-14. See
 * {@link https://www.assistant-ui.com/docs/tools/interactables#migrating-from-the-previous-api | Interactables migration guide}.
 */
export { useInteractableState } from "./interactables-legacy/useInteractableState";
export {
  /** @deprecated Unstable / Experimental — may change in any release. */
  unstable_useInteractable,
  type Unstable_InteractableConfig,
  type Unstable_InferInteractableState,
  type Unstable_InteractableVersionInfo,
} from "./model-context/useInteractable";
export {
  /** @deprecated Unstable / Experimental — may change in any release. */
  unstable_useInteractableState,
} from "./model-context/useInteractableState";
export {
  /** @deprecated Unstable / Experimental — may change in any release. */
  unstable_useInteractableVersions,
} from "./model-context/useInteractableVersions";
export {
  /** @deprecated Unstable / Experimental — may change in any release. */
  unstable_interactableTool,
  type Unstable_InteractableToolConfig,
  type Unstable_InteractableToolRenderProps,
} from "./model-context/interactableTool";
export {
  useToolArgsStatus,
  type ToolArgsStatus,
} from "./model-context/useToolArgsStatus";

// client
export { Tools, type McpAppResourceOutput } from "./client/Tools";
export { DataRenderers } from "./client/DataRenderers";
/**
 * @deprecated Since 2026-06-14 — migrate to the Unstable / Experimental API.
 * Scheduled for removal on/after 2026-09-14. See
 * {@link https://www.assistant-ui.com/docs/tools/interactables#migrating-from-the-previous-api | Interactables migration guide}.
 */
export { Interactables } from "./interactables-legacy/Interactables";
export {
  /** @deprecated Unstable / Experimental — may change in any release. */
  unstable_Interactables,
} from "./client/Interactables";

// types
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
  GenerativeUIComponentRegistry,
  GenerativeUIMessagePartComponent,
  GenerativeUIMessagePartProps,
  GenerativeUIRenderProps,
} from "./types/MessagePartComponentTypes";
export type {
  ToolsState,
  ToolsMethods,
  ToolsClientSchema,
} from "./types/scopes/tools";
export type {
  DataRenderersState,
  DataRenderersMethods,
  DataRenderersClientSchema,
} from "./types/scopes/dataRenderers";
export type {
  /** @deprecated Since 2026-06-14 — migrate to the Unstable / Experimental API. */
  InteractableStateSchema,
  /** @deprecated Since 2026-06-14 — migrate to the Unstable / Experimental API. */
  InteractablesState,
  /** @deprecated Since 2026-06-14 — migrate to the Unstable / Experimental API. */
  InteractableDefinition,
  /** @deprecated Since 2026-06-14 — migrate to the Unstable / Experimental API. */
  InteractableRegistration,
  /** @deprecated Since 2026-06-14 — migrate to the Unstable / Experimental API. */
  InteractablesMethods,
  /** @deprecated Since 2026-06-14 — migrate to the Unstable / Experimental API. */
  InteractablePersistedState,
  /** @deprecated Since 2026-06-14 — migrate to the Unstable / Experimental API. */
  InteractablePersistenceAdapter,
  /** @deprecated Since 2026-06-14 — migrate to the Unstable / Experimental API. */
  InteractablePersistenceStatus,
  /** @deprecated Since 2026-06-14 — migrate to the Unstable / Experimental API. */
  InteractablesClientSchema,
} from "./interactables-legacy/scopes";
export type {
  Unstable_InteractableStateSchema,
  Unstable_InteractablesState,
  Unstable_InteractableDefinition,
  Unstable_InteractableRegistration,
  Unstable_InteractablesMethods,
  Unstable_InteractablePersistedState,
  Unstable_InteractablePersistenceAdapter,
  Unstable_InteractablePersistenceStatus,
  Unstable_InteractablesClientSchema,
  Unstable_InteractablesConfig,
} from "./types/scopes/interactables";

// providers
export {
  MessageAttachmentByIndexProvider,
  ComposerAttachmentByIndexProvider,
} from "./providers/AttachmentByIndexProvider";
export { ThreadListItemRuntimeProvider } from "./providers/ThreadListItemRuntimeProvider";
export { MessageByIndexProvider } from "./providers/MessageByIndexProvider";
export { PartByIndexProvider } from "./providers/PartByIndexProvider";
export { TextMessagePartProvider } from "./providers/TextMessagePartProvider";
export { ChainOfThoughtByIndicesProvider } from "./providers/ChainOfThoughtByIndicesProvider";
export { ThreadListItemByIndexProvider } from "./providers/ThreadListItemByIndexProvider";
export { ChainOfThoughtPartByIndexProvider } from "./providers/ChainOfThoughtPartByIndexProvider";
export {
  SuggestionByIndexProvider,
  type SuggestionByIndexProviderProps,
} from "./providers/SuggestionByIndexProvider";
export {
  QueueItemByIndexProvider,
  type QueueItemByIndexProviderProps,
} from "./providers/QueueItemByIndexProvider";
export { ReadonlyThreadProvider } from "./providers/ReadonlyThreadProvider";

// RuntimeAdapter
export { RuntimeAdapter } from "./RuntimeAdapter";

// runtimes
export {
  RuntimeAdapterProvider,
  useRuntimeAdapters,
  type RuntimeAdapters,
} from "./runtimes/RuntimeAdapterProvider";
export { useExternalStoreRuntime } from "./runtimes/useExternalStoreRuntime";
export { useExternalStoreSharedOptions } from "./runtimes/useExternalStoreSharedOptions";
export {
  useExternalMessageConverter,
  convertExternalMessages,
} from "./runtimes/external-message-converter";
export type { JoinStrategy } from "./runtimes/external-message-converter";
export { createMessageConverter } from "./runtimes/createMessageConverter";
export {
  useStreamingTiming,
  type StreamingTimingAccessors,
  type StreamingTimingOptions,
  type StreamingTimingState,
} from "./runtimes/useStreamingTiming";
export { RemoteThreadListHookInstanceManager } from "./runtimes/RemoteThreadListHookInstanceManager";
export { RemoteThreadListThreadListRuntimeCore } from "./runtimes/RemoteThreadListThreadListRuntimeCore";
export { useRemoteThreadListRuntime } from "./runtimes/useRemoteThreadListRuntime";
export { useCloudThreadListAdapter } from "./runtimes/cloud/useCloudThreadListAdapter";
export { useAssistantCloudThreadHistoryAdapter } from "./runtimes/cloud/AssistantCloudThreadHistoryAdapter";
export { CloudFileAttachmentAdapter } from "./runtimes/cloud/CloudFileAttachmentAdapter";
export {
  createLocalStorageAdapter,
  type AsyncStorageLike,
} from "./adapters/LocalStorageThreadListAdapter";
export {
  createSimpleTitleAdapter,
  type TitleGenerationAdapter,
} from "./adapters/TitleGenerationAdapter";

// AssistantProvider base
export {
  AssistantProviderBase,
  getRenderComponent,
  type AssistantProviderBaseProps,
} from "./AssistantProvider";

// Shared primitives
export {
  ThreadPrimitiveMessages,
  ThreadPrimitiveMessagesImpl,
  ThreadPrimitiveMessageByIndex,
  ThreadPrimitiveUnstable_MessageById,
} from "./primitives/thread/ThreadMessages";
export {
  MessagePrimitiveParts,
  MessagePartComponent,
  MessagePrimitivePartByIndex,
  defaultComponents as messagePartsDefaultComponents,
  type EnrichedPartState,
  type PartState,
} from "./primitives/message/MessageParts";
export { MessagePrimitiveGroupedParts } from "./primitives/message/MessageGroupedParts";
export { groupPartByType, type GroupByContext } from "./utils/groupParts";
export {
  MessagePrimitiveGenerativeUI,
  GenerativeUIRender,
  GenerativeUIRenderError,
} from "./primitives/generativeUI/GenerativeUI";
export { MessagePrimitiveQuote } from "./primitives/message/MessageQuote";
export {
  MessagePrimitiveAttachments,
  MessagePrimitiveAttachmentByIndex,
} from "./primitives/message/MessageAttachments";
export {
  ComposerPrimitiveAttachments,
  ComposerPrimitiveAttachmentByIndex,
} from "./primitives/composer/ComposerAttachments";
export { ComposerPrimitiveQueue } from "./primitives/composer/ComposerQueue";
export {
  ThreadListPrimitiveItems,
  ThreadListPrimitiveItemByIndex,
} from "./primitives/threadList/ThreadListItems";
export { ChainOfThoughtPrimitiveParts } from "./primitives/chainOfThought/ChainOfThoughtParts";
export {
  PartPrimitiveMessages,
  PartPrimitiveMessagesImpl,
} from "./primitives/part/PartMessages";
export { MessagePartPrimitiveInProgress } from "./primitives/messagePart/MessagePartInProgress";
export { ThreadListItemPrimitiveTitle } from "./primitives/threadListItem/ThreadListItemTitle";
export {
  ThreadPrimitiveSuggestions,
  ThreadPrimitiveSuggestionsImpl,
  ThreadPrimitiveSuggestionByIndex,
} from "./primitives/thread/ThreadSuggestions";
export {
  ComposerPrimitiveIf,
  type UseComposerIfProps,
} from "./primitives/composer/ComposerIf";
export { getMessageQuote } from "./utils/getMessageQuote";

// Primitive hooks (shared behavior logic)
export { useThreadMessages } from "./primitive-hooks/useThreadMessages";
export { unstable_useThreadMessageIds } from "./primitive-hooks/useThreadMessageIds";
export { useThreadIsRunning } from "./primitive-hooks/useThreadIsRunning";
export { useThreadIsEmpty } from "./primitive-hooks/useThreadIsEmpty";
export { useComposerSend } from "./primitive-hooks/useComposerSend";
export { useComposerCancel } from "./primitive-hooks/useComposerCancel";
export { useComposerDictate } from "./primitive-hooks/useComposerDictate";
export { useComposerAddAttachment } from "./primitive-hooks/useComposerAddAttachment";
export { useMessageReload } from "./primitive-hooks/useMessageReload";
export { useMessageBranching } from "./primitive-hooks/useMessageBranching";
export {
  useActionBarCopy,
  type UseActionBarCopyOptions,
} from "./primitive-hooks/useActionBarCopy";
export { useActionBarEdit } from "./primitive-hooks/useActionBarEdit";
export { useActionBarReload } from "./primitive-hooks/useActionBarReload";
export {
  useActionBarFeedbackPositive,
  useActionBarFeedbackNegative,
} from "./primitive-hooks/useActionBarFeedback";
export { useActionBarSpeak } from "./primitive-hooks/useActionBarSpeak";
export { useActionBarStopSpeaking } from "./primitive-hooks/useActionBarStopSpeaking";
export {
  useVoiceState,
  useVoiceVolume,
  useVoiceControls,
} from "./primitive-hooks/useVoice";
export { useBranchPickerNext } from "./primitive-hooks/useBranchPickerNext";
export { useBranchPickerPrevious } from "./primitive-hooks/useBranchPickerPrevious";
export {
  useSuggestionTrigger,
  type UseSuggestionTriggerOptions,
} from "./primitive-hooks/useSuggestionTrigger";
export { useThreadListItemArchive } from "./primitive-hooks/useThreadListItemArchive";
export { useThreadListItemDelete } from "./primitive-hooks/useThreadListItemDelete";
export { useThreadListItemUnarchive } from "./primitive-hooks/useThreadListItemUnarchive";
export { useThreadListItemTrigger } from "./primitive-hooks/useThreadListItemTrigger";
export { useThreadListNew } from "./primitive-hooks/useThreadListNew";
export { useThreadListLoadMore } from "./primitive-hooks/useThreadListLoadMore";
export { useEditComposerCancel } from "./primitive-hooks/useEditComposerCancel";
export { useEditComposerSend } from "./primitive-hooks/useEditComposerSend";
export { useMessageError } from "./primitive-hooks/useMessageError";

// Shared AssistantRuntimeProvider
export { AssistantRuntimeProvider } from "./AssistantRuntimeProvider";

// Shared runtimes
export {
  useLocalRuntime,
  splitLocalRuntimeOptions,
  type LocalRuntimeOptions,
} from "./runtimes/useLocalRuntime";

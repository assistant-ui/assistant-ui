export { AuiProvider } from "./AuiProvider";
export { AuiIf } from "./AuiIf";
export { useAui } from "./useAui";
export { useAuiState } from "./useAuiState";
export { useAuiEvent } from "./useAuiEvent";

export { MessageByIdProvider } from "./primitives/MessageByIdProvider";
export { PartByIndexProvider } from "./primitives/PartByIndexProvider";
export { ThreadPrimitiveMessages } from "./primitives/ThreadPrimitiveMessages";
export { ThreadPrimitiveViewport } from "./primitives/ThreadPrimitiveViewport";
export { ThreadPrimitiveViewportFooter } from "./primitives/ThreadPrimitiveViewportFooter";
export { ThreadPrimitiveScrollToBottom } from "./primitives/ThreadPrimitiveScrollToBottom";
export {
  MessagePrimitiveParts,
  type ToolUIProps,
} from "./primitives/MessagePrimitiveParts";
export { ChainOfThoughtPrimitiveParts } from "./primitives/ChainOfThoughtPrimitiveParts";
export { ChainOfThoughtPrimitiveAccordionTrigger } from "./primitives/ChainOfThoughtPrimitiveAccordionTrigger";
export { ComposerPrimitiveInput } from "./primitives/ComposerPrimitiveInput";
export { ComposerPrimitiveSend } from "./primitives/ComposerPrimitiveSend";
export { ComposerPrimitiveCancel } from "./primitives/ComposerPrimitiveCancel";
export {
  BranchPickerPrimitivePrevious,
  BranchPickerPrimitiveNext,
  BranchPickerPrimitiveNumber,
  BranchPickerPrimitiveCount,
} from "./primitives/branchPicker";
export {
  ActionBarPrimitiveEdit,
  ActionBarPrimitiveReload,
  ActionBarPrimitiveCopy,
} from "./primitives/actionBar";
export {
  SuggestionByIndexProvider,
  ThreadPrimitiveSuggestions,
  SuggestionPrimitiveTrigger,
  SuggestionPrimitiveTitle,
  SuggestionPrimitiveDescription,
} from "./primitives/suggestions";
export {
  ThreadListItemByIndexProvider,
  ThreadListPrimitiveItems,
  ThreadListPrimitiveNew,
  ThreadListItemPrimitiveTitle,
  ThreadListItemPrimitiveTrigger,
} from "./primitives/threadList";
export { ThreadListPrimitiveRoot } from "./primitives/ThreadListPrimitiveRoot";
export { ThreadListItemPrimitiveRoot } from "./primitives/ThreadListItemPrimitiveRoot";
export { AttachmentByIndexProvider } from "./primitives/AttachmentByIndexProvider";
export {
  AttachmentPrimitiveRoot,
  AttachmentPrimitiveName,
  AttachmentPrimitiveThumb,
  AttachmentPrimitiveRemove,
} from "./primitives/attachment";
export {
  ComposerPrimitiveAttachments,
  ComposerPrimitiveAddAttachment,
  ComposerPrimitiveAttachmentDropzone,
} from "./primitives/composerAttachments";
export { MessagePrimitiveAttachments } from "./primitives/messageAttachments";
export { ErrorPrimitiveRoot, ErrorPrimitiveMessage } from "./primitives/error";
export { ThreadPrimitiveRoot } from "./primitives/thread";
export { MessagePrimitiveRoot } from "./primitives/message";
export {
  ThreadListPrimitiveLoadMore,
  ThreadListItemPrimitiveArchive,
  ThreadListItemPrimitiveUnarchive,
  ThreadListItemPrimitiveDelete,
} from "./primitives/threadListStructural";

export {
  AuiConfig,
  Derived,
  createAssistantClient,
  type AssistantClient,
  type AssistantClientHandle,
  type AssistantClientSource,
  type AssistantConfigSource,
  type AssistantState,
  type AssistantEventCallback,
  type AssistantEventName,
  type AssistantEventSelector,
  type Unsubscribe,
} from "@assistant-ui/store/client";

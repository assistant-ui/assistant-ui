export { AuiProvider } from "./AuiProvider";
export { useAui } from "./useAui";
export { useAuiState } from "./useAuiState";
export { useAuiEvent } from "./useAuiEvent";

export { ThreadPrimitiveViewport } from "./primitives/ThreadPrimitiveViewport";
export { ThreadPrimitiveViewportFooter } from "./primitives/ThreadPrimitiveViewportFooter";
export { ThreadPrimitiveScrollToBottom } from "./primitives/ThreadPrimitiveScrollToBottom";
export { useScrollLock } from "./useScrollLock";

export {
  ThreadListItemByIndexProvider,
  ThreadListPrimitiveItems,
  ThreadListItemPrimitiveTitle,
} from "./primitives/threadList";
export { ThreadListPrimitiveNew } from "./primitives/ThreadListPrimitiveNew";
export { ThreadListItemPrimitiveTrigger } from "./primitives/ThreadListItemPrimitiveTrigger";
export { ThreadListPrimitiveRoot } from "./primitives/ThreadListPrimitiveRoot";
export { ThreadListItemPrimitiveRoot } from "./primitives/ThreadListItemPrimitiveRoot";
export {
  ThreadListPrimitiveLoadMore,
  ThreadListItemPrimitiveArchive,
  ThreadListItemPrimitiveUnarchive,
  ThreadListItemPrimitiveDelete,
} from "./primitives/threadListStructural";

export { ComposerPrimitiveInput } from "./primitives/ComposerPrimitiveInput";
export { ComposerPrimitiveSend } from "./primitives/ComposerPrimitiveSend";
export { ComposerPrimitiveCancel } from "./primitives/ComposerPrimitiveCancel";
export { MessageByIdProvider } from "./primitives/MessageByIdProvider";
export { PartByIndexProvider } from "./primitives/PartByIndexProvider";
export { ThreadPrimitiveMessages } from "./primitives/ThreadPrimitiveMessages";
export {
  MessagePrimitiveParts,
  type ToolUIProps,
  type DataUIProps,
} from "./primitives/MessagePrimitiveParts";

export { ThreadPrimitiveRoot } from "./primitives/thread";
export { MessagePrimitiveRoot } from "./primitives/message";

export { ErrorPrimitiveRoot, ErrorPrimitiveMessage } from "./primitives/error";
export { ChainOfThoughtPrimitiveAccordionTrigger } from "./primitives/ChainOfThoughtPrimitiveAccordionTrigger";
export { ChainOfThoughtPrimitiveParts } from "./primitives/ChainOfThoughtPrimitiveParts";

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

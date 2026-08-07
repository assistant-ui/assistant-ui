export { AuiProvider } from "./AuiProvider";
export { AuiIf } from "./AuiIf";
export { useAui } from "./useAui";
export { useAuiState } from "./useAuiState";
export { useAuiEvent } from "./useAuiEvent";

export { MessageByIndexProvider } from "./primitives/MessageByIndexProvider";
export { PartByIndexProvider } from "./primitives/PartByIndexProvider";
export { ThreadPrimitiveMessages } from "./primitives/ThreadPrimitiveMessages";
export { ThreadPrimitiveViewport } from "./primitives/ThreadPrimitiveViewport";
export { MessagePrimitiveParts } from "./primitives/MessagePrimitiveParts";
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

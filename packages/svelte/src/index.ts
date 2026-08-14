export { provideAui } from "./provideAui";
export { useAui } from "./useAui";
export { useAuiState } from "./useAuiState";
export { useAuiEvent } from "./useAuiEvent";

export type { ScopeTarget } from "./context";
export {
  composerCancel,
  composerInput,
  composerSend,
} from "./primitives/composer";
export {
  actionBarCopy,
  actionBarEdit,
  actionBarReload,
} from "./primitives/actionBar";
export {
  branchPickerNext,
  branchPickerPrevious,
} from "./primitives/branchPicker";
export {
  threadScrollToBottom,
  threadViewport,
} from "./primitives/threadViewport";
export { threadMessages, type MessageItem } from "./primitives/threadMessages";
export { suggestionTrigger } from "./primitives/suggestions";
export {
  threadList,
  threadListItemTrigger,
  threadListNew,
  type ThreadListItem,
} from "./primitives/threadList";

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

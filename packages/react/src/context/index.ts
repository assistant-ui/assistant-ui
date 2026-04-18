export { AssistantRuntimeProvider } from "../legacy-runtime/AssistantRuntimeProvider";
export {
  ThreadListItemByIndexProvider,
  ThreadListItemRuntimeProvider,
} from "./providers/ThreadListItemProvider";
export { MessageByIndexProvider } from "./providers/MessageByIndexProvider";
export { SuggestionByIndexProvider } from "./providers/SuggestionByIndexProvider";
export { PartByIndexProvider } from "./providers/PartByIndexProvider";
export {
  MessageAttachmentByIndexProvider,
  ComposerAttachmentByIndexProvider,
} from "./providers/AttachmentByIndexProvider";
export { TextMessagePartProvider } from "./providers/TextMessagePartProvider";
export { MessageProvider } from "./providers/MessageProvider";
export { ChainOfThoughtByIndicesProvider } from "./providers/ChainOfThoughtByIndicesProvider";
export { ReadonlyThreadProvider } from "@assistant-ui/core/react";

export type { ThreadViewportState } from "./stores/ThreadViewport";

export {
  useThreadViewport,
  useThreadViewportStore,
} from "./react/ThreadViewportContext";

export {
  useAssistantRuntime,
  useThreadList,
} from "../legacy-runtime/hooks/AssistantContext";

export {
  useAttachmentRuntime,
  useAttachment,
  useThreadComposerAttachmentRuntime,
  useThreadComposerAttachment,
  useEditComposerAttachmentRuntime,
  useEditComposerAttachment,
  useMessageAttachment,
  useMessageAttachmentRuntime,
} from "../legacy-runtime/hooks/AttachmentContext";

export {
  useComposerRuntime,
  useComposer,
} from "../legacy-runtime/hooks/ComposerContext";

export {
  useMessageRuntime,
  useEditComposer,
  useMessage,
} from "../legacy-runtime/hooks/MessageContext";

export {
  useMessagePartRuntime,
  useMessagePart,
} from "../legacy-runtime/hooks/MessagePartContext";

export {
  useThreadRuntime,
  useThread,
  useThreadComposer,
  useThreadModelContext,
} from "../legacy-runtime/hooks/ThreadContext";

export {
  useThreadListItemRuntime,
  useThreadListItem,
} from "../legacy-runtime/hooks/ThreadListItemContext";

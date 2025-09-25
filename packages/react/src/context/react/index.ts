"use client";
// TODO createContextStoreHook does not work well with server-side nextjs bundler
// use client necessary here for now

export { useAssistantApi, type AssistantApi } from "./AssistantApiContext";
export { useAssistantState } from "./hooks/useAssistantState";
export { useAssistantEvent } from "./hooks/useAssistantEvent";

export {
  useThreadViewport,
  useThreadViewportStore,
} from "./ThreadViewportContext";

export {
  useAssistantRuntime,
  useThreadList,
} from "../../legacy-runtime/hooks/AssistantContext";

export {
  useAttachmentRuntime,
  useAttachment,
  useThreadComposerAttachmentRuntime,
  useThreadComposerAttachment,
  useEditComposerAttachmentRuntime,
  useEditComposerAttachment,
  useMessageAttachment,
  useMessageAttachmentRuntime,
} from "../../legacy-runtime/hooks/AttachmentContext";

export {
  useComposerRuntime,
  useComposer,
} from "../../legacy-runtime/hooks/ComposerContext";

export {
  useMessageRuntime,
  useEditComposer,
  useMessage,
} from "../../legacy-runtime/hooks/MessageContext";

export {
  useMessagePartRuntime,
  useMessagePart,
} from "../../legacy-runtime/hooks/MessagePartContext";

export {
  useThreadRuntime,
  useThread,
  useThreadComposer,
  useThreadModelContext,
} from "../../legacy-runtime/hooks/ThreadContext";

export {
  useThreadListItemRuntime,
  useThreadListItem,
} from "../../legacy-runtime/hooks/ThreadListItemContext";

export { AssistantProvider } from "./AssistantApiContext";

"use client";
// TODO createContextStoreHook does not work well with server-side nextjs bundler
// use client necessary here for now

export { useAssistantState, useAssistantApi } from "./AssistantApiContext";
export { useAssistantEvent } from "../../hooks/useAssistantEvent";

export {
  useThreadViewport,
  useThreadViewportStore,
} from "./ThreadViewportContext";

export { useAssistantRuntime, useThreadList } from "./legacy/AssistantContext";

export {
  useAttachmentRuntime,
  useAttachment,
  useThreadComposerAttachmentRuntime,
  useThreadComposerAttachment,
  useEditComposerAttachmentRuntime,
  useEditComposerAttachment,
  useMessageAttachment,
  useMessageAttachmentRuntime,
} from "./legacy/AttachmentContext";

export { useComposerRuntime, useComposer } from "./legacy/ComposerContext";

export {
  useMessageRuntime,
  useEditComposer,
  useMessage,
} from "./legacy/MessageContext";

export {
  useMessagePartRuntime,
  useMessagePart,
} from "./legacy/MessagePartContext";

export {
  useThreadRuntime,
  useThread,
  useThreadComposer,
  useThreadModelContext,
} from "./legacy/ThreadContext";

export {
  useThreadListItemRuntime,
  useThreadListItem,
} from "./legacy/ThreadListItemContext";

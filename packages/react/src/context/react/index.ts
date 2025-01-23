"use client";
// TODO createContextStoreHook does not work well with server-side nextjs bundler
// use client necessary here for now

export {
  useAssistantRuntime,
  useThreadList,
  useToolUIs,
  useToolUIsStore,
} from "./AssistantContext";

export {
  useThreadRuntime,
  useThread,
  useThreadComposer,
  useThreadModelConfig,
  useThreadViewport,
  useThreadViewportStore,
} from "./ThreadContext";

export {
  useThreadListItemRuntime,
  useThreadListItem,
} from "./ThreadListItemContext";

export {
  useMessageRuntime,
  useMessage,
  useEditComposer,
  useMessageUtils,
  useMessageUtilsStore,
} from "./MessageContext";
export { useContentPartRuntime, useContentPart } from "./ContentPartContext";
export { useComposerRuntime, useComposer } from "./ComposerContext";

export {
  useAttachment,
  useAttachmentRuntime,

  // TODO decide if we want to export/drop these?
  // useEditComposerAttachment,
  // useEditComposerAttachmentRuntime,
  // useMessageAttachment,
  // useMessageAttachmentRuntime,
  // useThreadComposerAttachment,
  // useThreadComposerAttachmentRuntime,
} from "./AttachmentContext";

export { useRuntimeState } from "./utils/useRuntimeState";

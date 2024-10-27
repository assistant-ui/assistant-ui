export {
  useAssistantRuntime,
  useThreadList,
  useToolUIs,
  useToolUIsStore,

  /**
   * @deprecated Use `useAssistantRuntime()` instead. This will be removed in 0.6.0.
   */
  useAssistantActions,
  /**
   * @deprecated Use `useAssistantRuntime()` instead. This will be removed in 0.6.0.
   */
  useAssistantActionsStore,
  /**
   * @deprecated Use `useAssistantRuntime()` instead. This will be removed in 0.6.0.
   */
  useAssistantRuntimeStore,

  /**
   * @deprecated You can import the hooks directly, e.g. `import { useAssistantRuntime } from "@assistant-ui/react"`. This will be removed in 0.6.0.
   */
  type AssistantContextValue,
  /**
   * @deprecated You can import the hooks directly, e.g. `import { useAssistantRuntime } from "@assistant-ui/react"`. This will be removed in 0.6.0.
   */
  useAssistantContext,
} from "./AssistantContext";

export {
  useThreadRuntime,
  useThread,
  useThreadComposer,
  useThreadModelConfig,

  /**
   * @deprecated Use `useThread().messages` instead. This will be removed in 0.6.0.
   */
  useThreadMessages,

  /**
   * @deprecated Use `useThreadRuntime().getState()` instead. This will be removed in 0.6.0.
   */
  useThreadStore,

  /**
   * @deprecated Use `useThreadRuntime().getState().messages` instead. This will be removed in 0.6.0.
   */
  useThreadMessagesStore,

  /**
   * @deprecated Use `useThreadRuntime()` instead. This will be removed in 0.6.0.
   */
  useThreadActions,

  /**
   * @deprecated Use `useThreadRuntime()` instead. This will be removed in 0.6.0.
   */
  useThreadActionsStore,

  /**
   * @deprecated Use `useThreadRuntime()` instead. This will be removed in 0.6.0.
   */
  useThreadRuntimeStore,
  // TODO move out of runtime context after 0.6.0
  useThreadViewport,
  // TODO move out of runtime context after 0.6.0
  useThreadViewportStore,

  /**
   * @deprecated Use `useThreadRuntime().composer.getState()` instead. This will be removed in 0.6.0.
   */
  useThreadComposerStore,

  /**
   * @deprecated You can import the hooks directly, e.g. `import { useThread } from "@assistant-ui/react"`. This will be removed in 0.6.0.
   */
  type ThreadContextValue,
  /**
   * @deprecated You can import the hooks directly, e.g. `import { useThread } from "@assistant-ui/react"`. This will be removed in 0.6.0.
   */
  useThreadContext,
} from "./ThreadContext";
export {
  useMessageRuntime,
  useMessage,
  useEditComposer,
  // TODO move out of runtime context after 0.6.0
  useMessageUtils,
  // TODO move out of runtime context after 0.6.0
  useMessageUtilsStore,

  /**
   * @deprecated Use `useMessageRuntime().getState()` instead. This will be removed in 0.6.0.
   */
  useMessageStore,

  /**
   * @deprecated Use `useMessageRuntime().composer.getState()` instead. This will be removed in 0.6.0.
   */
  useEditComposerStore,

  /**
   * @deprecated You can import the hooks directly, e.g. `import { useMessage } from "@assistant-ui/react"`. This will be removed in 0.6.0.
   */
  type MessageContextValue,
  /**
   * @deprecated You can import the hooks directly, e.g. `import { useMessage } from "@assistant-ui/react"`. This will be removed in 0.6.0.
   */
  useMessageContext,
} from "./MessageContext";
export {
  useContentPartRuntime,
  useContentPart,

  /**
   * @deprecated Use `useContentPartRuntime().getState()` instead. This will be removed in 0.6.0.
   */
  useContentPartStore,

  /**
   * @deprecated You can import the hooks directly, e.g. `import { useContentPart } from "@assistant-ui/react"`. This will be removed in 0.6.0.
   */
  type ContentPartContextValue,
  /**
   * @deprecated You can import the hooks directly, e.g. `import { useContentPart } from "@assistant-ui/react"`. This will be removed in 0.6.0.
   */
  useContentPartContext,
} from "./ContentPartContext";
export {
  useComposerRuntime,
  useComposer,

  /**
   * @deprecated Use `useComposerRuntime().getState()` instead. This will be removed in 0.6.0.
   */
  useComposerStore,

  /**
   * @deprecated You can import the hooks directly, e.g. `import { useComposer } from "@assistant-ui/react"`. This will be removed in 0.6.0.
   */
  type ComposerContextValue,
  /**
   * @deprecated You can import the hooks directly, e.g. `import { useComposer } from "@assistant-ui/react"`. This will be removed in 0.6.0.
   */
  useComposerContext,
} from "./ComposerContext";

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

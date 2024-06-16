export * from "./actions";
export * from "./primitives";
export * from "./runtime";

// deprecated, remove in 0.1.0
export {
  VercelAIAssistantProvider,
  type VercelAIAssistantProviderProps,
  VercelRSCAssistantProvider,
  type VercelRSCAssistantProviderProps,
} from "./runtime/vercel-deprecated";

/**
 * @deprecated This type was renamed to `VercelRSCMessage`. Please use that import. Will be removed in 0.1.0.
 */
export type { VercelRSCMessage as RSCMessage } from "@assistant-ui/react-ai-sdk";

// experimental
export type {
  ThreadMessage,
  AssistantMessage,
  UserMessage,
  AppendMessage,
  AssistantContentPart,
  UserContentPart,
  AppendContentPart,
  TextContentPart,
  ImageContentPart as unstable_ImageContentPart,
  ToolCallContentPart as unstable_ToolCallContentPart,
  UIContentPart as unstable_UIContentPart,
} from "./utils/AssistantTypes";

export { useLocalRuntime as unstable_useLocalRuntime } from "./runtime/local/useLocalRuntime";
export type {
  ChatModelAdapter as unstable_ChatModelAdapter,
  ChatModelRunOptions as unstable_ChatModelRunOptions,
} from "./runtime/local/ChatModelAdapter";

export { AssistantRuntimeProvider } from "./context/providers/AssistantRuntimeProvider";
export {
  // context
  useThreadContext as unstable_useThreadContext,
  type ThreadContextValue as unstable_ThreadContextValue,
  useMessageContext as unstable_useMessageContext,
  type MessageContextValue as unstable_MessageContextValue,
  useComposerContext as unstable_useComposerContext,
  type ComposerContextValue as unstable_ComposerContextValue,
  useContentPartContext as unstable_useContentPartContext,
  type ContentPartContextValue as unstable_ContentPartContextValue,
  // stores
  type ThreadState as unstable_ThreadState,
  type ComposerState as unstable_ComposerState,
  type ThreadViewportState as unstable_ThreadViewportState,
  type MessageState as unstable_MessageState,
  type EditComposerState as unstable_EditComposerState,
  type ContentPartState as unstable_ContentPartState,
} from "./context";

export * as ThreadPrimitive from "./primitives/thread";
export * as ComposerPrimitive from "./primitives/composer";
export * as MessagePrimitive from "./primitives/message";
export * as BranchPickerPrimitive from "./primitives/branchPicker";
export * as ActionBarPrimitive from "./primitives/actionBar";
export * as ContentPartPrimitive from "./primitives/contentPart";

// deprecated
export {
  VercelAIAssistantProvider,
  type VercelAIAssistantProviderProps,
  VercelRSCAssistantProvider,
  type VercelRSCAssistantProviderProps,
} from "./runtime/vercel-deprecated";

/**
 * @deprecated This type was renamed to `VercelRSCMessage`. Please use that import. Will be removed in 0.1.0.
 */
export type { VercelRSCMessage as RSCMessage } from "./runtime/vercel-ai/rsc/VercelRSCRuntime";

export type { VercelRSCMessage } from "./runtime/vercel-ai/rsc/VercelRSCRuntime";

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

export { AssistantRuntimeProvider } from "./runtime/core/AssistantRuntimeProvider";
export { useLocalRuntime as unstable_useLocalRuntime } from "./runtime/local/useLocalRuntime";
export type {
  ChatModelAdapter as unstable_ChatModelAdapter,
  ChatModelRunOptions as unstable_ChatModelRunOptions,
} from "./runtime/local/ChatModelAdapter";
export { VercelModelAdapter as unstable_VercelModelAdapter } from "./runtime/local/vercel/VercelModelAdapter";

export {
  getVercelAIMessage as unstable_getVercelMessage,
  getVercelRSCMessage as unstable_getVercelRSCMessage,
} from "./runtime/vercel-ai/utils/VercelThreadMessage";

export {
  // context
  useAssistantContext as unstable_useAssistantContext,
  type AssistantContextValue as unstable_AssistantContextValue,
  useComposerContext as unstable_useComposerContext,
  type ComposerContextValue as unstable_ComposerContextValue,
  useMessageContext as unstable_useMessageContext,
  type MessageContextValue as unstable_MessageContextValue,
  useContentPartContext as unstable_useContentPartContext,
  type ContentPartContextValue as unstable_ContentPartContextValue,
  // stores
  type BaseComposerState as unstable_BaseComposerState,
  type ContentPartState as unstable_ContentPartState,
  type MessageState as unstable_MessageState,
  type MessageComposerState as unstable_MessageComposerState,
  type ThreadState as unstable_ThreadState,
  type ThreadComposerState as unstable_ThreadComposerState,
  type ThreadViewportState as unstable_ThreadViewportState,
} from "./context";

export {
  useCopyMessage,
  useReloadMessage,
  useBeginMessageEdit,
  useGoToNextBranch,
  useGoToPreviousBranch,
} from "./actions";

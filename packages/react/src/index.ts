export * as ThreadPrimitive from "./primitives/thread";
export * as ComposerPrimitive from "./primitives/composer";
export * as MessagePrimitive from "./primitives/message";
export * as BranchPickerPrimitive from "./primitives/branchPicker";
export * as ActionBarPrimitive from "./primitives/actionBar";
export * as ContentPartPrimitive from "./primitives/contentPart";

export {
  VercelAIAssistantProvider,
  VercelRSCAssistantProvider,
} from "./adapters/vercel";

export type {
  VercelAIAssistantProviderProps,
  VercelRSCAssistantProviderProps,
} from "./adapters/vercel";
export type { VercelRSCMessage } from "./adapters/core/vercel-rsc/VercelRSCRuntime";

/**
 * @deprecated This type was renamed to `VercelRSCMessage`. Please use that import. Will be removed in 0.1.0.
 */
export type { VercelRSCMessage as RSCMessage } from "./adapters/core/vercel-rsc/VercelRSCRuntime";

export type {
  AppendMessage,
  AppendContentPart,
  TextContentPart,
  ImageContentPart,
} from "./utils/context/stores/AssistantTypes";

export { AssistantProvider as unstable_AssistantProvider } from "./adapters/core/AssistantProvider";
export { useLocalRuntime as unstable_useLocalRuntime } from "./adapters/core/local/useLocalRuntime";
export type {
  ChatModelAdapter as unstable_ChatModelAdapter,
  ChatModelRunOptions as unstable_ChatModelRunOptions,
} from "./adapters/core/local/ChatModelAdapter";
export { VercelModelAdapter as unstable_VercelModelAdapter } from "./adapters/core/local/vercel/VercelModelAdapter";

export { getVercelMessage as unstable_getVercelMessage } from "./adapters/vercel/VercelThreadMessage";
export { getVercelRSCMessage as unstable_getVercelRSCMessage } from "./adapters/vercel/VercelThreadMessage";
export { useMessageContext as unstable_useMessageContext } from "./utils/context/useMessageContext";

export {
  useCopyMessage,
  useReloadMessage,
  useBeginMessageEdit,
  useGoToNextBranch,
  useGoToPreviousBranch,
} from "./actions";

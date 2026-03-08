// Re-export from @assistant-ui/core
export type {
  ThreadRuntimeCore,
  ThreadListRuntimeCore,
} from "@assistant-ui/core";

// Re-export from @assistant-ui/core/internal
export {
  DefaultThreadComposerRuntimeCore,
  CompositeContextProvider,
  MessageRepository,
  BaseAssistantRuntimeCore,
  generateId,
  AssistantRuntimeImpl,
  ThreadRuntimeImpl,
  fromThreadMessageLike,
  getAutoStatus,
} from "@assistant-ui/core/internal";
export type {
  ThreadRuntimeCoreBinding,
  ThreadListItemRuntimeBinding,
} from "@assistant-ui/core/internal";

// React-specific (stay in react)
export { splitLocalRuntimeOptions } from "./legacy-runtime/runtime-cores/local/LocalRuntimeOptions";
export {
  useToolInvocations,
  type ToolExecutionStatus,
} from "./legacy-runtime/runtime-cores/assistant-transport/useToolInvocations";

export * from "./utils/smooth";

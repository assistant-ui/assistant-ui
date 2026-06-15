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
  AssistantRuntimeImpl,
  ThreadRuntimeImpl,
  getAutoStatus,
} from "@assistant-ui/core/internal";
export type {
  ThreadRuntimeCoreBinding,
  ThreadListItemRuntimeBinding,
} from "@assistant-ui/core/internal";

// React-specific (stay in react)
export { splitLocalRuntimeOptions } from "./legacy-runtime/runtime-cores/local/LocalRuntimeOptions";
export type { ToolExecutionStatus } from "@assistant-ui/core";

export { useSmooth } from "./utils/smooth/useSmooth";
export {
  useSmoothStatus,
  withSmoothContextProvider,
} from "./utils/smooth/SmoothContext";

// ComposerInput plugin registry (used by react-lexical)
export { useComposerInputPluginRegistryOptional } from "./primitives/composer/ComposerInputPluginContext";

// @assistant-ui/core/internal - Internal implementation details
// Not part of the public API. Used by @assistant-ui/react and other framework bindings.

export {
  // Sentinel
  SKIP_UPDATE,
  // Base classes
  BaseSubscribable,
  BaseSubject,
  // Subject implementations
  ShallowMemoizeSubject,
  LazyMemoizeSubject,
  NestedSubscriptionSubject,
  EventSubscriptionSubject,
} from "./subscribable/subscribable";

export type {
  SKIP_UPDATE as SKIP_UPDATE_TYPE,
  // Core types
  Subscribable,
  SubscribableWithState,
  NestedSubscribable,
  EventSubscribable,
} from "./subscribable/subscribable";

// ID generation
export {
  generateId,
  generateErrorMessageId,
  isErrorMessageId,
} from "./utils/id";

// Message utilities
export { getThreadMessageText } from "./utils/text";
export { resolveToolApprovalResponse } from "./runtime/utils/resolveToolApprovalResponse";
export { consumeSuggestionResult } from "./adapters/suggestion";

// Composite context provider
export { CompositeContextProvider } from "./utils/composite-context-provider";

// Shared attachment data-URL encoder, reused by framework adapters so the
// FileReader fallback lives in one place.
export { getFileDataURL } from "./adapters/attachment";

// Streaming-stable tool-args stringifier, reused by framework adapters so the
// key-order stabilization lives in one place.
export {
  stableStringifyToolArgs,
  trackToolArgsKeyOrder,
} from "./utils/json/stable-stringify-tool-args";

// Runtime extras helper for external-store adapters. Internal because the
// tap-native runtime path replaces the `thread.extras` side-channel it wraps.
export {
  createRuntimeExtras,
  type RuntimeExtras,
} from "./react/runtimes/createRuntimeExtras";

export * from "./runtime/internal";
export * from "./runtimes/internal";

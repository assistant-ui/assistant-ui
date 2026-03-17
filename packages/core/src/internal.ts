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
  generateOptimisticId,
  isOptimisticId,
  generateErrorMessageId,
  isErrorMessageId,
} from "./utils/id";

// Message utilities
export { getThreadMessageText } from "./utils/text";

// Composite context provider
export { CompositeContextProvider } from "./utils/composite-context-provider";

export * from "./runtime/internal";
export * from "./runtimes/internal";

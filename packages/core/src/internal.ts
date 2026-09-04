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
export { toMessagePartStatus } from "./utils/normalizePartStatus";
export { notifyEventListeners } from "./utils/notify-event-listeners";
export { resolveToolApprovalResponse } from "./runtime/utils/resolveToolApprovalResponse";
export { consumeSuggestionResult } from "./adapters/suggestion";

// Composite context provider
export { CompositeContextProvider } from "./utils/composite-context-provider";

// Shared attachment data-URL encoder, reused by framework adapters so the
// FileReader fallback lives in one place.
export { getFileDataURL, fileMatchesAccept } from "./adapters/attachment";
export { isCreateAttachment } from "./types/attachment";

// Streaming-stable tool-args stringifier, reused by framework adapters so the
// key-order stabilization lives in one place.
export {
  stableStringifyToolArgs,
  trackToolArgsKeyOrder,
} from "./utils/json/stable-stringify-tool-args";

// JSON type guards, reused by framework bindings so the depth-guarded
// validation lives in one place.
export { isJSONValue, isRecord } from "./utils/json/is-json";

// Data-URL decoder and http(s) matcher, reused by framework adapters so the
// outbound part conversion lives in one place.
export {
  dataUrlMediaType,
  type FilePartSource,
  httpUrlPattern,
  isParsableUrl,
  parseDataUrl,
  resolveFilePartSource,
} from "./utils/data-url";
export { invokeUserCallback } from "./utils/invoke-user-callback";
export { detectImageMediaType } from "./utils/image-media-type";
export {
  resolveFileMediaType,
  resolveImageMediaType,
  toMediaWireUrl,
} from "./utils/wire-media";
export {
  createToolCallCancellationStub,
  scanPendingToolCalls,
} from "./runtime/utils/pending-tool-calls";
// Nested tool-call traversal, reused by framework adapters so the
// ToolCallMessagePart.messages tree is walked one way.
export {
  iterateToolCallParts,
  mapToolCallPartsDeep,
  type ToolCallTreeEntry,
  walkToolCallTree,
} from "./runtime/utils/tool-call-tree";
export {
  createAbortableThreadLoad,
  type AbortableThreadLoadPurpose,
} from "./runtime/utils/abortable-thread-load";
export { createCloudThreadListAdapterCreateFallback } from "./react/runtimes/cloud/createCloudThreadListAdapterCreateFallback";

export * from "./runtime/internal";
export * from "./runtimes/internal";

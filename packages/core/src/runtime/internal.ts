// =============================================================================
// Internal API — implementation details used by framework bindings
// Not part of the public API surface.
// =============================================================================

// Binding Types
export type {
  ComposerRuntimeCoreBinding,
  ThreadComposerRuntimeCoreBinding,
  EditComposerRuntimeCoreBinding,
  MessageStateBinding,
} from "./api/bindings";

// Base Runtime Core Implementations
export { BaseAssistantRuntimeCore } from "./base/base-assistant-runtime-core";
export { BaseThreadRuntimeCore } from "./base/base-thread-runtime-core";
export { BaseComposerRuntimeCore } from "./base/base-composer-runtime-core";
export { DefaultThreadComposerRuntimeCore } from "./base/default-thread-composer-runtime-core";
export { DefaultEditComposerRuntimeCore } from "./base/default-edit-composer-runtime-core";

// Runtime Impl Classes
export { AssistantRuntimeImpl } from "./api/assistant-runtime";

export {
  getThreadState,
  ThreadRuntimeImpl,
} from "./api/thread-runtime";
export type {
  ThreadRuntimeCoreBinding,
  ThreadListItemRuntimeBinding,
} from "./api/thread-runtime";

export { ThreadListRuntimeImpl } from "./api/thread-list-runtime";
export type { ThreadListRuntimeCoreBinding } from "./api/thread-list-runtime";

export { ThreadListItemRuntimeImpl } from "./api/thread-list-item-runtime";
export type { ThreadListItemStateBinding } from "./api/thread-list-item-runtime";

export { MessageRuntimeImpl } from "./api/message-runtime";
export { MessagePartRuntimeImpl } from "./api/message-part-runtime";

export {
  ComposerRuntimeImpl,
  ThreadComposerRuntimeImpl,
  EditComposerRuntimeImpl,
} from "./api/composer-runtime";

export {
  AttachmentRuntimeImpl,
  ThreadComposerAttachmentRuntimeImpl,
  EditComposerAttachmentRuntimeImpl,
  MessageAttachmentRuntimeImpl,
} from "./api/attachment-runtime";

// Supporting Utilities
export { fromThreadMessageLike } from "./shared/thread-message-like";
export { symbolInnerMessage } from "./shared/external-store-message";
export { isAutoStatus, getAutoStatus } from "./shared/auto-status";

export {
  ExportedMessageRepository,
  MessageRepository,
} from "./shared/message-repository";
export type { ExportedMessageRepositoryItem } from "./shared/message-repository";

// Local Runtime
export { LocalRuntimeCore } from "./local/local-runtime-core";
export { LocalThreadListRuntimeCore } from "./local/local-thread-list-runtime-core";
export type { LocalThreadFactory } from "./local/local-thread-list-runtime-core";
export { LocalThreadRuntimeCore } from "./local/local-thread-runtime-core";
export type { LocalRuntimeOptionsBase } from "./local/local-runtime-options";
export { shouldContinue } from "./local/should-continue";

// External Store Runtime
export { ExternalStoreRuntimeCore } from "./external-store/external-store-runtime-core";
export { ExternalStoreThreadListRuntimeCore } from "./external-store/external-store-thread-list-runtime-core";
export type { ExternalStoreThreadFactory } from "./external-store/external-store-thread-list-runtime-core";
export {
  ExternalStoreThreadRuntimeCore,
  hasUpcomingMessage,
} from "./external-store/external-store-thread-runtime-core";
export { ThreadMessageConverter } from "./external-store/thread-message-converter";
export type { ConverterCallback } from "./external-store/thread-message-converter";

// Remote Thread List
export { OptimisticState } from "./remote-thread-list/optimistic-state";
export { EMPTY_THREAD_CORE } from "./remote-thread-list/empty-thread-core";
export type {
  RemoteThreadData,
  THREAD_MAPPING_ID,
  RemoteThreadState,
} from "./remote-thread-list/remote-thread-state";
export {
  createThreadMappingId,
  getThreadData,
  updateStatusReducer,
} from "./remote-thread-list/remote-thread-state";
export type {
  RemoteThreadInitializeResponse,
  RemoteThreadListOptions,
} from "./remote-thread-list/types";

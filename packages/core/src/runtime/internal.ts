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
export { fromThreadMessageLike } from "./utils/thread-message-like";
export { symbolInnerMessage } from "./utils/external-store-message";
export { isAutoStatus, getAutoStatus } from "./utils/auto-status";

export {
  ExportedMessageRepository,
  MessageRepository,
} from "./utils/message-repository";
export type { ExportedMessageRepositoryItem } from "./utils/message-repository";

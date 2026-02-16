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
} from "./bindings";

// Base Runtime Core Implementations
export { BaseAssistantRuntimeCore } from "./base-assistant-runtime-core";
export { BaseThreadRuntimeCore } from "./base-thread-runtime-core";
export { BaseComposerRuntimeCore } from "./base-composer-runtime-core";
export { DefaultThreadComposerRuntimeCore } from "./default-thread-composer-runtime-core";
export { DefaultEditComposerRuntimeCore } from "./default-edit-composer-runtime-core";

// Runtime Impl Classes
export { AssistantRuntimeImpl } from "./assistant-runtime";

export {
  getThreadState,
  ThreadRuntimeImpl,
} from "./thread-runtime";
export type {
  ThreadRuntimeCoreBinding,
  ThreadListItemRuntimeBinding,
} from "./thread-runtime";

export { ThreadListRuntimeImpl } from "./thread-list-runtime";
export type { ThreadListRuntimeCoreBinding } from "./thread-list-runtime";

export { ThreadListItemRuntimeImpl } from "./thread-list-item-runtime";
export type { ThreadListItemStateBinding } from "./thread-list-item-runtime";

export { MessageRuntimeImpl } from "./message-runtime";
export { MessagePartRuntimeImpl } from "./message-part-runtime";

export {
  ComposerRuntimeImpl,
  ThreadComposerRuntimeImpl,
  EditComposerRuntimeImpl,
} from "./composer-runtime";

export {
  AttachmentRuntimeImpl,
  ThreadComposerAttachmentRuntimeImpl,
  EditComposerAttachmentRuntimeImpl,
  MessageAttachmentRuntimeImpl,
} from "./attachment-runtime";

// Supporting Utilities
export { fromThreadMessageLike } from "./thread-message-like";
export { symbolInnerMessage } from "./external-store-message";
export { isAutoStatus, getAutoStatus } from "./auto-status";

export {
  ExportedMessageRepository,
  MessageRepository,
} from "./message-repository";
export type { ExportedMessageRepositoryItem } from "./message-repository";

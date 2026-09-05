export type {
  // Message parts
  TextMessagePart,
  ReasoningMessagePart,
  PartProviderMetadata,
  SourceProviderMetadata,
  SourceMessagePart,
  ImageMessagePart,
  FileMessagePart,
  DataMessagePart,
  GenerativeUIMessagePart,
  GenerativeUINode,
  GenerativeUISpec,
  /**
   * @deprecated Experimental since 2025-06-26, extended 2027-03-05. Not scheduled for removal; the API may change in any release.
   */
  Unstable_AudioMessagePart,
  ToolCallMessagePart,
  ToolModelContentPart,
  ThreadUserMessagePart,
  ThreadAssistantMessagePart,
  // Message status
  MessagePartStatus,
  MessagePartStreamStatus,
  ToolCallMessagePartStatus,
  MessageStatus,
  // Thread messages
  MessageTiming,
  ThreadStep,
  ThreadSystemMessage,
  ThreadUserMessage,
  ThreadAssistantMessage,
  ThreadMessage,
  MessageRole,
  // Config
  RunConfig,
  AppendMessage,
} from "./message";

export type {
  Attachment,
  PendingAttachment,
  CompleteAttachment,
  AttachmentStatus,
  CreateAttachment,
} from "./attachment";

export type { Unsubscribe } from "./unsubscribe";

export type { QuoteInfo } from "./quote";

export type {
  /**
   * @deprecated Experimental since 2026-03-16, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  Unstable_DirectiveSegment,
  /**
   * @deprecated Experimental since 2026-03-16, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
   */
  Unstable_DirectiveFormatter,
} from "./directive";

export type { Unstable_TriggerItem, Unstable_TriggerCategory } from "./trigger";

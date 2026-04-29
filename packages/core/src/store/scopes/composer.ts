import type { Attachment, CreateAttachment } from "../../types/attachment";
import type { MessageRole } from "../../types/message";
import type { QuoteInfo } from "../../types/quote";
import type { RunConfig } from "../../types/message";
import type { ComposerRuntime } from "../../runtime/api/composer-runtime";
import type {
  AttachmentAddErrorReason,
  DictationState,
  SendOptions,
} from "../../runtime/interfaces/composer-runtime-core";
import type { AttachmentMethods } from "./attachment";
import type { QueueItemState, QueueItemMethods } from "./queue-item";

export type ComposerSendOptions = SendOptions & {
  /**
   * Whether to steer (interrupt the current run and process this message immediately).
   * When false (default), the message is queued and processed in order.
   */
  steer?: boolean;
};

export type ComposerState = {
  readonly text: string;
  readonly role: MessageRole;
  readonly attachments: readonly Attachment[];
  readonly runConfig: RunConfig;
  readonly isEditing: boolean;
  readonly canCancel: boolean;
  readonly attachmentAccept: string;
  readonly isEmpty: boolean;
  readonly type: "thread" | "edit";

  /**
   * The current state of dictation.
   * Undefined when dictation is not active.
   */
  readonly dictation: DictationState | undefined;

  /**
   * The currently quoted text, if any.
   * Undefined when no quote is set.
   */
  readonly quote: QuoteInfo | undefined;

  /**
   * The queue of messages waiting to be processed.
   * Empty when no messages are queued.
   */
  readonly queue: readonly QueueItemState[];
};

export type ComposerMethods = {
  getState(): ComposerState;
  setText(text: string): void;
  setRole(role: MessageRole): void;
  setRunConfig(runConfig: RunConfig): void;
  addAttachment(fileOrAttachment: File | CreateAttachment): Promise<void>;
  clearAttachments(): Promise<void>;
  attachment(selector: { index: number } | { id: string }): AttachmentMethods;
  reset(): Promise<void>;
  send(opts?: ComposerSendOptions): void;
  cancel(): void;
  beginEdit(): void;

  /**
   * Start dictation to convert voice to text input.
   * Requires a DictationAdapter to be configured.
   */
  startDictation(): void;

  /**
   * Stop the current dictation session.
   */
  stopDictation(): void;

  /**
   * Set a quote for the next message. Pass undefined to clear.
   */
  setQuote(quote: QuoteInfo | undefined): void;

  /**
   * Access a queue item by index.
   */
  queueItem(selector: { index: number }): QueueItemMethods;

  __internal_getRuntime?(): ComposerRuntime;
};

export type ComposerMeta = {
  source: "thread" | "message";
  query: Record<string, never>;
};

export type ComposerEvents = {
  /**
   * @deprecated State-derivable. Observe composer `text` clearing via
   * `useAuiState` instead. Kept for backward compatibility.
   */
  "composer.send": { threadId: string; messageId?: string };
  /**
   * @deprecated State-derivable. Observe composer `attachments` via
   * `useAuiState` instead. Kept for backward compatibility.
   */
  "composer.attachmentAdd": { threadId: string; messageId?: string };
  "composer.attachmentAddError": {
    threadId: string;
    messageId?: string;
    attachmentId?: string;
    reason: AttachmentAddErrorReason;
    message: string;
  };
};

export type ComposerClientSchema = {
  methods: ComposerMethods;
  meta: ComposerMeta;
  events: ComposerEvents;
};

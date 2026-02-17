import type {
  Attachment,
  MessageRole,
  RunConfig,
  QuoteInfo,
} from "../../types";
import type { ComposerRuntime, DictationState } from "../../runtime";
import type { AttachmentMethods } from "./attachment";

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
};

export type ComposerMethods = {
  getState(): ComposerState;
  setText(text: string): void;
  setRole(role: MessageRole): void;
  setRunConfig(runConfig: RunConfig): void;
  addAttachment(file: File): Promise<void>;
  clearAttachments(): Promise<void>;
  attachment(selector: { index: number } | { id: string }): AttachmentMethods;
  reset(): Promise<void>;
  send(): void;
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

  __internal_getRuntime?(): ComposerRuntime;
};

export type ComposerMeta = {
  source: "thread" | "message";
  query: Record<string, never>;
};

export type ComposerEvents = {
  "composer.send": { threadId: string; messageId?: string };
  "composer.attachmentAdd": { threadId: string; messageId?: string };
};

export type ComposerClientSchema = {
  methods: ComposerMethods;
  meta: ComposerMeta;
  events: ComposerEvents;
};

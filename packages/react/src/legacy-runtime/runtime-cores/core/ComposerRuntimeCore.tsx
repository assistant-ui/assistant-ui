import type {
  MessageRole,
  RunConfig,
  QuoteInfo,
  Attachment,
  PendingAttachment,
  Unsubscribe,
} from "@assistant-ui/core";
import type { DictationAdapter } from "../adapters/speech/SpeechAdapterTypes";

export type ComposerRuntimeEventType = "send" | "attachmentAdd";

/**
 * State representing an active dictation session.
 */
export type DictationState = {
  readonly status: DictationAdapter.Status;
  /**
   * The current interim (partial) transcript being recognized.
   * This is a preview of what the user is saying and may change
   * as dictation refines its prediction.
   *
   * Note: By default, interim transcripts are shown directly in the composer
   * input field (like native dictation). This property is provided for
   * advanced customization when you want to display or style the interim
   * transcript separately.
   */
  readonly transcript?: string;
  /** Whether text input is disabled during this dictation session. */
  readonly inputDisabled?: boolean;
};

export type ComposerRuntimeCore = Readonly<{
  isEditing: boolean;

  canCancel: boolean;
  isEmpty: boolean;

  attachments: readonly Attachment[];
  attachmentAccept: string;

  addAttachment: (file: File) => Promise<void>;
  removeAttachment: (attachmentId: string) => Promise<void>;

  text: string;
  setText: (value: string) => void;

  role: MessageRole;
  setRole: (role: MessageRole) => void;

  runConfig: RunConfig;
  setRunConfig: (runConfig: RunConfig) => void;

  quote: QuoteInfo | undefined;
  setQuote: (quote: QuoteInfo | undefined) => void;

  reset: () => Promise<void>;
  clearAttachments: () => Promise<void>;

  send: () => void;
  cancel: () => void;

  /**
   * The current state of dictation.
   * Undefined when dictation is not active.
   */
  dictation: DictationState | undefined;

  /**
   * Start dictation to convert voice to text input.
   * Requires a DictationAdapter to be configured.
   */
  startDictation: () => void;

  /**
   * Stop the current dictation session.
   */
  stopDictation: () => void;

  subscribe: (callback: () => void) => Unsubscribe;

  unstable_on: (
    event: ComposerRuntimeEventType,
    callback: () => void,
  ) => Unsubscribe;
}>;

export type ThreadComposerRuntimeCore = ComposerRuntimeCore &
  Readonly<{
    attachments: readonly PendingAttachment[];
  }>;

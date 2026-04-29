import type { MessageRole } from "../../types/message";
import type { QuoteInfo } from "../../types/quote";
import type { Attachment, CreateAttachment } from "../../types/attachment";
import type { Unsubscribe } from "../../types/unsubscribe";
import type { RunConfig } from "../../types/message";
import type { DictationAdapter } from "../../adapters/speech";

export type AttachmentAddErrorReason =
  | "no-adapter"
  | "not-accepted"
  | "adapter-error";

export type AttachmentAddErrorEvent = {
  readonly reason: AttachmentAddErrorReason;
  readonly message: string;
  readonly attachmentId?: string;
  readonly error?: Error;
};

export type ComposerRuntimeEventPayload = {
  /**
   * @deprecated State-derivable. Observe `state.text` clearing via
   * `subscribe` + `getState` instead. Kept for backward compatibility.
   */
  send: Record<string, never>;
  /**
   * @deprecated State-derivable. Observe `state.attachments` via `subscribe` +
   * `getState` instead. Kept for backward compatibility.
   */
  attachmentAdd: Record<string, never>;
  attachmentAddError: AttachmentAddErrorEvent;
};

export type ComposerRuntimeEventType = keyof ComposerRuntimeEventPayload;

export type ComposerRuntimeEventCallback<E extends ComposerRuntimeEventType> = (
  payload: ComposerRuntimeEventPayload[E],
) => void;

export type DictationState = {
  readonly status: DictationAdapter.Status;
  readonly transcript?: string;
  readonly inputDisabled?: boolean;
};

export type SendOptions = {
  startRun?: boolean;
};

export type ComposerRuntimeCore = Readonly<{
  isEditing: boolean;

  canCancel: boolean;
  isEmpty: boolean;

  attachments: readonly Attachment[];
  attachmentAccept: string;

  addAttachment: (fileOrAttachment: File | CreateAttachment) => Promise<void>;
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

  send: (options?: SendOptions) => void;
  cancel: () => void;

  dictation: DictationState | undefined;
  startDictation: () => void;
  stopDictation: () => void;

  subscribe: (callback: () => void) => Unsubscribe;

  /**
   * @deprecated This API is still under active development and might change without notice.
   * For state-derivable transitions, prefer `subscribe` + `getState`. This channel is the
   * escape hatch for transient occurrences not represented in state.
   */
  unstable_on: <E extends ComposerRuntimeEventType>(
    event: E,
    callback: ComposerRuntimeEventCallback<E>,
  ) => Unsubscribe;
}>;

export type ThreadComposerRuntimeCore = ComposerRuntimeCore;

export type EditComposerRuntimeCore = ComposerRuntimeCore &
  Readonly<{
    parentId: string | null;
    sourceId: string | null;
  }>;

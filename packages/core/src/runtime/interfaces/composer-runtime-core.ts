import type { MessageRole } from "../../types/message";
import type { QuoteInfo } from "../../types/quote";
import type { Attachment, CreateAttachment } from "../../types/attachment";
import type { Unsubscribe } from "../../types/unsubscribe";
import type { RunConfig } from "../../types/message";
import type { DictationAdapter } from "../../adapters/speech";
import type { QueueItemState } from "../queue/queue-item";
import type { QueuePlacement } from "../queue/external-thread-queue-adapter";

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
   * Fired after a send with the size of what went out. The composer state is
   * already cleared when it fires, so the counts are only available here.
   */
  send: {
    readonly chars: number;
    readonly attachments: number;
  };
  /**
   * @deprecated State-derivable. Observe `state.attachments` via `subscribe` +
   * `getState` instead. Kept for backward compatibility.
   */
  attachmentAdd: { readonly contentType?: string | undefined };
  attachmentAddError: AttachmentAddErrorEvent & {
    readonly contentType?: string | undefined;
  };
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

/**
 * A message the user sent that the thread does not show as one of its own
 * yet, because its attachments are still being prepared or the runtime has
 * not shown it since taking it. A send that cannot be delivered takes its
 * content back into the draft, so a submission is always in flight.
 */
export type ComposerSubmission = {
  readonly id: string;
  readonly role: MessageRole;
  readonly text: string;
  readonly quote: QuoteInfo | undefined;
  readonly attachments: readonly Attachment[];
};

export type SendOptions = {
  startRun?: boolean;
  /** Process this message next; only meaningful with the `queue` capability. */
  steer?: boolean;
};

export type ComposerRuntimeCore = Readonly<{
  isEditing: boolean;

  canCancel: boolean;
  canSend: boolean;
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

  /** The message this composer sent while its attachments are prepared. */
  submission?: ComposerSubmission | undefined;
  /** Messages this composer handed to the runtime that the thread does not show yet. */
  inTransit?: readonly ComposerSubmission[] | undefined;

  queue: readonly QueueItemState[];
  moveQueueItem: (queueItemId: string, placement: QueuePlacement) => void;
  removeQueueItem: (queueItemId: string) => void;

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

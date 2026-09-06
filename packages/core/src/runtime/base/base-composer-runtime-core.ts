import {
  isAttachmentComplete,
  isCreateAttachment,
  type Attachment,
  type CompleteAttachment,
  type CreateAttachment,
  type PendingAttachment,
} from "../../types/attachment";
import type { MessageRole, AppendMessage } from "../../types/message";
import { isMessageNotSentError } from "../../types/error";
import type { QuoteInfo } from "../../types/quote";
import type { Unsubscribe } from "../../types/unsubscribe";
import type { RunConfig } from "../../types/message";
import { BaseSubscribable } from "../../subscribable/subscribable";
import {
  type AttachmentAdapter,
  fileMatchesAccept,
} from "../../adapters/attachment";
import type {
  AttachmentAddErrorReason,
  ComposerRuntimeCore,
  ComposerRuntimeEventCallback,
  ComposerRuntimeEventPayload,
  ComposerRuntimeEventType,
  DictationState,
  SendOptions,
} from "../interfaces/composer-runtime-core";
import type { DictationAdapter } from "../../adapters/speech";
import type { QueuePlacement } from "../queue/external-thread-queue-adapter";
import { EMPTY_QUEUE_ITEMS, type QueueItemState } from "../queue/queue-item";
import { generateId } from "../../utils/id";
import { notifyEventListeners } from "../../utils/notify-event-listeners";
import {
  AttachmentAddOperations,
  drainAttachmentAdd,
} from "../utils/attachment-add-operations";

export abstract class BaseComposerRuntimeCore
  extends BaseSubscribable
  implements ComposerRuntimeCore
{
  public readonly isEditing = true;

  protected abstract getAttachmentAdapter(): AttachmentAdapter | undefined;
  protected abstract getDictationAdapter(): DictationAdapter | undefined;

  protected enrichWithComposerMetadata<
    T extends { metadata?: { custom?: Record<string, unknown> } },
  >(message: T, composerMetadata: Record<string, unknown> | undefined): T {
    if (!composerMetadata) return message;
    return {
      ...message,
      metadata: {
        ...message.metadata,
        custom: { ...message.metadata?.custom, ...composerMetadata },
      },
    } as T;
  }

  public get attachmentAccept(): string {
    return this.getAttachmentAdapter()?.accept ?? "*";
  }

  private _attachments: readonly Attachment[] = [];
  public get attachments() {
    return this._attachments;
  }

  protected setAttachments(value: readonly Attachment[]) {
    this._attachments = value;
    this._notifySubscribers();
  }

  public abstract get canCancel(): boolean;
  public abstract get canSend(): boolean;

  public get isEmpty() {
    return !this.text.trim() && !this.attachments.length;
  }

  private _text = "";

  get text() {
    return this._text;
  }

  private _role: MessageRole = "user";

  get role() {
    return this._role;
  }

  private _runConfig: RunConfig = {};

  get runConfig() {
    return this._runConfig;
  }

  private _quote: QuoteInfo | undefined = undefined;

  get quote() {
    return this._quote;
  }

  public setQuote(quote: QuoteInfo | undefined) {
    if (this._quote === quote) return;

    this._quote = quote;
    this._notifySubscribers();
  }

  public setText(value: string) {
    if (this._text === value) return;

    this._text = value;
    this._rebaseDictation(value);
    this._notifySubscribers();
  }

  // A live dictation session appends to the text it last saw, so any write
  // that bypasses `setText` has to move that baseline or the next transcript
  // overwrites what was just written.
  private _rebaseDictation(value: string) {
    if (!this._dictation) return;

    this._dictationBaseText = value;
    this._currentInterimText = "";
    const { status, inputDisabled } = this._dictation;
    this._dictation = inputDisabled ? { status, inputDisabled } : { status };
  }

  public setRole(role: MessageRole) {
    if (this._role === role) return;

    this._role = role;
    this._notifySubscribers();
  }

  public setRunConfig(runConfig: RunConfig) {
    if (this._runConfig === runConfig) return;

    this._runConfig = runConfig;
    this._notifySubscribers();
  }

  protected _isSending = false;
  private _removedDuringSend = new Set<string>();
  private _sendGeneration = 0;
  private _attachmentAddOperations = new AttachmentAddOperations();

  private _cancelAttachmentAdd(attachmentId: string) {
    this._attachmentAddOperations.cancel(attachmentId);
  }

  private _cancelAllAttachmentAdds() {
    this._attachmentAddOperations.cancelAll();
  }

  private _emptyTextAndAttachments() {
    this._attachments = [];
    this._text = "";
    this._notifySubscribers();
  }

  private async _onClearAttachments() {
    const adapter = this.getAttachmentAdapter();
    if (adapter) {
      const pending = this._attachments.filter((a) => !isAttachmentComplete(a));
      await Promise.all(pending.map((a) => adapter.remove(a)));
    }
  }

  public async reset() {
    this._cancelAllAttachmentAdds();

    // A send whose adapter never settles must not brick the composer; reset is
    // the escape hatch that releases the in-flight lock. Bumping the generation
    // invalidates that send entirely so a late-settling upload can neither
    // append the discarded draft nor touch a newer send's lock.
    this._sendGeneration++;
    this._isSending = false;
    this._removedDuringSend.clear();

    if (
      this._attachments.length === 0 &&
      this._text === "" &&
      this._role === "user" &&
      Object.keys(this._runConfig).length === 0 &&
      this._quote === undefined
    ) {
      return;
    }

    this._role = "user";
    this._runConfig = {};
    this._quote = undefined;

    const task = this._onClearAttachments();
    this._emptyTextAndAttachments();
    await task;
  }

  public async clearAttachments() {
    this._cancelAllAttachmentAdds();
    const task = this._onClearAttachments();
    this.setAttachments([]);

    await task;
  }

  public async send(options?: SendOptions) {
    if (!this.canSend || this._isSending) return;

    if (this._dictationSession) {
      this._dictationSession.cancel();
      this._cleanupDictation();
    }

    const adapter = this.getAttachmentAdapter();
    const attachmentTasks = this.attachments.map(async (a) => {
      if (isAttachmentComplete(a)) return a;
      if (!adapter) throw new Error("Attachments are not supported");
      const result = await adapter.send(a);
      return result as CompleteAttachment;
    });

    const originalAttachments = this.attachments;
    const text = this.text;
    const quote = this._quote;
    const role = this.role;
    const runConfig = this.runConfig;
    this._quote = undefined;
    this._text = "";
    this._isSending = true;
    const generation = ++this._sendGeneration;
    this._notifySubscribers();

    let resolvedAttachments: CompleteAttachment[];
    try {
      resolvedAttachments = await Promise.all(attachmentTasks);
    } catch (e) {
      if (generation === this._sendGeneration) {
        if (!this.text.trim() && this._quote === undefined) {
          this._text = text;
          this._rebaseDictation(text);
          this._quote = quote;
          this._notifySubscribers();
        }
        // Promise.all rejects on the first failure, but sibling uploads from
        // this batch keep running; the send rejects immediately while the
        // retry lock is held until they settle, or a retry could re-send
        // attachments that are still in flight.
        void Promise.allSettled(attachmentTasks).then(() => {
          if (generation !== this._sendGeneration) return;
          this._removedDuringSend.clear();
          this._isSending = false;
          this._notifySubscribers();
        });
      }
      throw e;
    }

    // A reset during the upload discarded this send's draft; the settled
    // uploads must not append it or touch the lock a newer send may own.
    if (generation !== this._sendGeneration) return;

    // Drop by id, not wholesale: the user may have added or removed chips while
    // the upload was in flight.
    const sentIds = new Set(originalAttachments.map((a) => a.id));
    this._attachments = this._attachments.filter((a) => !sentIds.has(a.id));
    this._isSending = false;
    this._notifySubscribers();

    // An attachment removed mid-upload can't be cancelled, but it can still be
    // dropped from the outgoing message instead of silently being sent anyway.
    const finalAttachments = resolvedAttachments.filter(
      (a) => !this._removedDuringSend.has(a.id),
    );
    this._removedDuringSend.clear();

    const message: Omit<AppendMessage, "parentId" | "sourceId"> = {
      createdAt: new Date(),
      role,
      content: text ? [{ type: "text", text }] : [],
      attachments: finalAttachments,
      runConfig,
      metadata: { custom: { ...(quote ? { quote } : {}) } },
    };

    const draft = { text, quote, attachments: finalAttachments };
    let sendTask: void | Promise<void>;
    try {
      sendTask = this.handleSend(message, options);
    } catch (error) {
      this._restoreUnsentDraft(error, generation, draft);
      throw error;
    }
    if (sendTask)
      void sendTask.catch((error) => {
        this._restoreUnsentDraft(error, generation, draft);
      });
    this._notifyEventSubscribers("send", {});
  }

  /**
   * Take a message back into the composer when it has nowhere else to live:
   * a send the runtime never dispatched, or a message a cancelled run is
   * removing from the thread. Reports whether the composer accepted it, so a
   * caller that is also removing the message can keep it instead of dropping
   * it. Refused, and left untouched, while the composer holds anything of its
   * own.
   */
  public restoreDraft(draft: {
    text: string;
    quote?: QuoteInfo | undefined;
    attachments?: readonly Attachment[] | undefined;
  }): boolean {
    if (
      this._text.trim() ||
      this._quote !== undefined ||
      this._attachments.length > 0
    )
      return false;

    this._text = draft.text;
    this._rebaseDictation(draft.text);
    this._quote = draft.quote;
    this._attachments = draft.attachments ?? [];
    this._notifySubscribers();
    return true;
  }

  /**
   * Inverse of `restoreDraft`: clears the composer while it still holds
   * exactly the given draft. A draft the user has edited since is left
   * untouched.
   */
  public retractDraft(draft: {
    text: string;
    quote?: QuoteInfo | undefined;
    attachments?: readonly Attachment[] | undefined;
  }): void {
    const attachmentsUntouched =
      draft.attachments !== undefined
        ? this._attachments === draft.attachments
        : this._attachments.length === 0;
    if (
      this._text !== draft.text ||
      this._quote !== draft.quote ||
      !attachmentsUntouched
    )
      return;

    this._text = "";
    this._rebaseDictation("");
    this._quote = undefined;
    this._attachments = [];
    this._notifySubscribers();
  }

  // The generation check is what a reset and a later send use to invalidate a
  // draft, so of several queued drafts only the most recent one is still
  // restorable.
  private _restoreUnsentDraft(
    error: unknown,
    generation: number,
    draft: {
      text: string;
      quote: QuoteInfo | undefined;
      attachments: readonly CompleteAttachment[];
    },
  ) {
    if (!isMessageNotSentError(error)) return;
    if (generation !== this._sendGeneration) return;
    this.restoreDraft(draft);
  }

  public cancel() {
    this.handleCancel();
  }

  public get queue(): readonly QueueItemState[] {
    return EMPTY_QUEUE_ITEMS;
  }

  public moveQueueItem(
    _queueItemId: string,
    _placement: QueuePlacement,
  ): void {}
  public removeQueueItem(_queueItemId: string): void {}

  protected abstract handleSend(
    message: Omit<AppendMessage, "parentId" | "sourceId">,
    options?: SendOptions,
  ): void | Promise<void>;
  protected abstract handleCancel(): void;

  async addAttachment(fileOrAttachment: File | CreateAttachment) {
    if (isCreateAttachment(fileOrAttachment)) {
      const adapter = this.getAttachmentAdapter();
      if (
        adapter &&
        !fileMatchesAccept(
          {
            name: fileOrAttachment.name,
            type: fileOrAttachment.contentType ?? "",
          },
          adapter.accept,
        )
      ) {
        const message = `File type ${fileOrAttachment.contentType || "unknown"} is not accepted. Accepted types: ${adapter.accept}`;
        const err = new Error(message);
        this._safeEmitAttachmentAddError(
          "not-accepted",
          message,
          undefined,
          err,
        );
        throw err;
      }

      const a: CompleteAttachment = {
        id: fileOrAttachment.id ?? generateId(),
        type: fileOrAttachment.type ?? "document",
        name: fileOrAttachment.name,
        contentType: fileOrAttachment.contentType,
        content: fileOrAttachment.content,
        status: { type: "complete" },
      };
      this._attachments = [...this._attachments, a];
      this._notifySubscribers();
      this._notifyEventSubscribers("attachmentAdd", {});
      return;
    }

    const adapter = this.getAttachmentAdapter();
    if (!adapter) {
      const message = "Attachments are not supported";
      const err = new Error(message);
      this._safeEmitAttachmentAddError("no-adapter", message, undefined, err);
      throw err;
    }

    if (
      !fileMatchesAccept(
        { name: fileOrAttachment.name, type: fileOrAttachment.type },
        adapter.accept,
      )
    ) {
      const message = `File type ${fileOrAttachment.type || "unknown"} is not accepted. Accepted types: ${adapter.accept}`;
      const err = new Error(message);
      this._safeEmitAttachmentAddError("not-accepted", message, undefined, err);
      throw err;
    }

    const operation = this._attachmentAddOperations.start();
    const upsertAttachment = (a: PendingAttachment) => {
      if (!this._attachmentAddOperations.accept(operation, a.id)) return false;

      const idx = this._attachments.findIndex(
        (attachment) => attachment.id === a.id,
      );
      if (idx !== -1)
        this._attachments = [
          ...this._attachments.slice(0, idx),
          a,
          ...this._attachments.slice(idx + 1),
        ];
      else {
        this._attachments = [...this._attachments, a];
      }

      this._notifySubscribers();
      return true;
    };
    let lastAttachment: PendingAttachment | undefined;
    try {
      await drainAttachmentAdd(
        adapter.add({ file: fileOrAttachment }),
        (attachment) => {
          lastAttachment = attachment;
          return upsertAttachment(attachment);
        },
      );
    } catch (e) {
      if (this._attachmentAddOperations.isCancelled(operation)) return;
      if (lastAttachment) {
        upsertAttachment({
          ...lastAttachment,
          status: {
            type: "incomplete",
            reason: "error",
            message: e instanceof Error ? e.message : String(e),
          },
        });
      }
      this._safeEmitAttachmentAddError(
        "adapter-error",
        e instanceof Error ? e.message : String(e),
        lastAttachment?.id,
        e instanceof Error ? e : undefined,
      );
      throw e;
    } finally {
      this._attachmentAddOperations.finish(operation);
    }

    if (this._attachmentAddOperations.isCancelled(operation)) return;
    if (
      lastAttachment?.status.type === "incomplete" &&
      lastAttachment.status.reason === "error"
    ) {
      this._safeEmitAttachmentAddError(
        "adapter-error",
        lastAttachment.status.message ??
          "Attachment upload did not complete successfully.",
        lastAttachment.id,
      );
    } else {
      this._notifyEventSubscribers("attachmentAdd", {});
    }
  }

  private _safeEmitAttachmentAddError(
    reason: AttachmentAddErrorReason,
    message: string,
    attachmentId?: string,
    error?: Error,
  ) {
    try {
      this._notifyEventSubscribers("attachmentAddError", {
        reason,
        message,
        ...(attachmentId !== undefined && { attachmentId }),
        ...(error !== undefined && { error }),
      });
    } catch (subscriberError) {
      console.error(
        "[assistant-ui] attachmentAddError subscriber threw:",
        subscriberError,
      );
    }
  }

  async removeAttachment(attachmentId: string) {
    const index = this._attachments.findIndex((a) => a.id === attachmentId);
    if (index === -1) throw new Error("Attachment not found");
    const attachment = this._attachments[index]!;

    this._cancelAttachmentAdd(attachmentId);

    // A send in flight may already be uploading this attachment; the upload
    // can't be cancelled, so mark it to be dropped from the outgoing message
    // before any await gives the upload a chance to settle first.
    if (this._isSending) this._removedDuringSend.add(attachmentId);

    if (!isAttachmentComplete(attachment)) {
      const adapter = this.getAttachmentAdapter();
      if (!adapter) throw new Error("Attachments are not supported");
      try {
        await adapter.remove(attachment);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this._attachments = this._attachments.map((candidate) =>
          candidate.id === attachmentId && !isAttachmentComplete(candidate)
            ? {
                ...candidate,
                status: { type: "incomplete", reason: "error", message },
              }
            : candidate,
        );
        this._notifySubscribers();
        throw error;
      }
    }
    this._attachments = this._attachments.filter((a) => a.id !== attachmentId);
    this._notifySubscribers();
  }

  private _dictation: DictationState | undefined;
  private _dictationSession: DictationAdapter.Session | undefined;
  private _dictationUnsubscribes: Unsubscribe[] = [];
  private _dictationBaseText = "";
  private _currentInterimText = "";
  private _dictationSessionIdCounter = 0;
  private _activeDictationSessionId: number | undefined;
  private _isCleaningDictation = false;

  public get dictation(): DictationState | undefined {
    return this._dictation;
  }

  private _isActiveSession(
    sessionId: number,
    session: DictationAdapter.Session,
  ): boolean {
    return (
      this._activeDictationSessionId === sessionId &&
      this._dictationSession === session
    );
  }

  public startDictation(): void {
    const adapter = this.getDictationAdapter();
    if (!adapter) {
      throw new Error("Dictation adapter not configured");
    }

    if (this._dictationSession) {
      for (const unsub of this._dictationUnsubscribes) {
        unsub();
      }
      this._dictationUnsubscribes = [];
      const oldSession = this._dictationSession;
      oldSession.stop().catch(() => {});
      this._dictationSession = undefined;
    }

    const inputDisabled = adapter.disableInputDuringDictation ?? false;

    this._dictationBaseText = this._text;
    this._currentInterimText = "";

    const session = adapter.listen();
    this._dictationSession = session;
    const sessionId = ++this._dictationSessionIdCounter;
    this._activeDictationSessionId = sessionId;
    this._dictation = { status: session.status, inputDisabled };
    this._notifySubscribers();

    const unsubSpeech = session.onSpeech((result) => {
      if (!this._isActiveSession(sessionId, session)) return;
      const isFinal = result.isFinal !== false;

      const needsSeparator =
        this._dictationBaseText &&
        !this._dictationBaseText.endsWith(" ") &&
        result.transcript;
      const separator = needsSeparator ? " " : "";

      if (isFinal) {
        this._dictationBaseText =
          this._dictationBaseText + separator + result.transcript;
        this._currentInterimText = "";
        this._text = this._dictationBaseText;

        if (this._dictation) {
          const { transcript: _, ...rest } = this._dictation;
          this._dictation = rest;
        }
        this._notifySubscribers();
      } else {
        this._currentInterimText = separator + result.transcript;
        this._text = this._dictationBaseText + this._currentInterimText;

        if (this._dictation) {
          this._dictation = {
            ...this._dictation,
            transcript: result.transcript,
          };
        }
        this._notifySubscribers();
      }
    });
    this._dictationUnsubscribes.push(unsubSpeech);

    const unsubStart = session.onSpeechStart(() => {
      if (!this._isActiveSession(sessionId, session)) return;

      this._dictation = {
        status: { type: "running" },
        inputDisabled,
        ...(this._dictation?.transcript && {
          transcript: this._dictation.transcript,
        }),
      };
      this._notifySubscribers();
    });
    this._dictationUnsubscribes.push(unsubStart);

    const unsubEnd = session.onSpeechEnd(() => {
      this._cleanupDictation({ sessionId });
    });
    this._dictationUnsubscribes.push(unsubEnd);

    const statusInterval = setInterval(() => {
      if (!this._isActiveSession(sessionId, session)) return;

      if (session.status.type === "ended") {
        this._cleanupDictation({ sessionId });
      }
    }, 100);
    this._dictationUnsubscribes.push(() => clearInterval(statusInterval));
  }

  public stopDictation(): void {
    if (!this._dictationSession) return;

    const session = this._dictationSession;
    const sessionId = this._activeDictationSessionId;
    const cleanup = () => this._cleanupDictation({ sessionId });
    void session.stop().then(cleanup, cleanup);
  }

  private _cleanupDictation(options?: { sessionId: number | undefined }): void {
    const isStaleSession =
      options?.sessionId !== undefined &&
      options.sessionId !== this._activeDictationSessionId;
    if (isStaleSession || this._isCleaningDictation) return;

    this._isCleaningDictation = true;
    try {
      for (const unsub of this._dictationUnsubscribes) {
        unsub();
      }
      this._dictationUnsubscribes = [];
      this._dictationSession = undefined;
      this._activeDictationSessionId = undefined;
      this._dictation = undefined;
      this._dictationBaseText = "";
      this._currentInterimText = "";
      this._notifySubscribers();
    } finally {
      this._isCleaningDictation = false;
    }
  }

  private _eventSubscribers = new Map<
    ComposerRuntimeEventType,
    Set<(payload?: unknown) => void>
  >();

  protected _notifyEventSubscribers<E extends ComposerRuntimeEventType>(
    event: E,
    payload: ComposerRuntimeEventPayload[E],
  ) {
    const subscribers = this._eventSubscribers.get(event);
    if (!subscribers) return;

    notifyEventListeners(subscribers, payload, `Composer runtime "${event}"`);
  }

  public unstable_on<E extends ComposerRuntimeEventType>(
    event: E,
    callback: ComposerRuntimeEventCallback<E>,
  ) {
    const wrapped = callback as (payload?: unknown) => void;
    let subscribers = this._eventSubscribers.get(event);
    if (!subscribers) {
      subscribers = new Set();
      this._eventSubscribers.set(event, subscribers);
    }
    subscribers.add(wrapped);

    return () => {
      this._eventSubscribers.get(event)?.delete(wrapped);
    };
  }
}

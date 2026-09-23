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
  ComposerSubmission,
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
import { AttachmentSendOperations } from "../utils/attachment-send-operations";

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

  private _submission: ComposerSubmission | undefined;
  private _submissionSend:
    | {
        readonly submission: ComposerSubmission;
        readonly options: SendOptions | undefined;
        readonly runConfig: RunConfig;
        readonly controller: AbortController;
      }
    | undefined;
  private _submissionAck: Unsubscribe | undefined;
  private _submissionDispatched = false;
  private _sendGeneration = 0;
  private _attachmentAddOperations = new AttachmentAddOperations();
  private _attachmentSends = new AttachmentSendOperations();

  public get submission() {
    return this._submission;
  }

  /**
   * Whether a send is still being prepared. A submission the runtime already
   * took only waits to be replaced by the message it became, so it no longer
   * holds the composer.
   */
  protected get isSubmitting() {
    return this._submission !== undefined && !this._submissionDispatched;
  }

  /** Whether a send takes the draft with it, leaving the composer free. */
  protected get detachesDraftOnSend(): boolean {
    return true;
  }

  /**
   * Starts watching for the message a submission is about to be dispatched as,
   * from the state the thread is in before the dispatch. The returned function
   * holds the submission until that message shows up.
   */
  protected watchDispatch(
    _role: MessageRole,
  ): (settle: () => void) => Unsubscribe | undefined {
    return (settle) => {
      settle();
      return undefined;
    };
  }

  private _cancelAttachmentAdd(attachmentId: string) {
    this._attachmentAddOperations.cancel(attachmentId);
  }

  private _cancelAllAttachmentAdds() {
    this._attachmentAddOperations.cancelAll();
  }

  private _emptyTextAndAttachments() {
    this._attachments = [];
    this._text = "";
    this._rebaseDictation("");
    this._notifySubscribers();
  }

  private async _onClearAttachments() {
    const adapter = this.getAttachmentAdapter();
    if (adapter) {
      const pending = this._attachments.filter((a) => !isAttachmentComplete(a));
      await Promise.all(pending.map(async (a) => adapter.remove(a)));
    }
  }

  public async reset() {
    this._cancelAllAttachmentAdds();

    // A send whose adapter never settles must not brick the composer; reset is
    // the escape hatch that releases the in-flight lock. Bumping the generation
    // invalidates that send entirely so a late-settling upload can neither
    // append the discarded draft nor touch a newer send's lock.
    this._sendGeneration++;
    const discarded = this._discardSubmission();

    if (
      this._attachments.length === 0 &&
      this._text === "" &&
      this._role === "user" &&
      Object.keys(this._runConfig).length === 0 &&
      this._quote === undefined
    ) {
      await discarded;
      return;
    }

    this._role = "user";
    this._runConfig = {};
    this._quote = undefined;

    const task = this._onClearAttachments();
    this._emptyTextAndAttachments();
    await Promise.all([task, discarded]);
  }

  public async clearAttachments() {
    this._cancelAllAttachmentAdds();
    if (this.isSubmitting) {
      for (const attachment of this._attachments)
        this._attachmentSends.markRemoved(attachment);
    }
    const task = this._onClearAttachments();
    this.setAttachments([]);

    await task;
  }

  public async send(options?: SendOptions) {
    if (!this.canSend || this.isSubmitting) return;
    if (this._submission) this._clearSubmission();

    if (this._dictationSession) {
      try {
        this._dictationSession.cancel();
      } catch (error) {
        console.error("[assistant-ui] Dictation session cancel threw", error);
      } finally {
        this._cleanupDictation();
      }
    }

    // An attachment whose removal is still awaiting the adapter is excluded
    // up front, or a send started mid-removal would upload and dispatch it.
    const attachments = this.attachments.filter(
      (attachment) => !this._attachmentSends.isRemoved(attachment),
    );
    // canSend counted an attachment whose removal is still in flight, so the
    // draft can be empty by the time the filter above has run.
    if (!this.text.trim() && attachments.length === 0) return;

    const submission: ComposerSubmission = {
      id: generateId(),
      role: this.role,
      text: this.text,
      quote: this._quote,
      attachments,
    };
    this._submission = submission;
    this._submissionSend = {
      submission,
      options,
      runConfig: this.runConfig,
      controller: new AbortController(),
    };
    if (this.detachesDraftOnSend) {
      const detached = new Set(attachments);
      this._attachments = this._attachments.filter((a) => !detached.has(a));
      this._text = "";
      this._rebaseDictation("");
      this._quote = undefined;
    }
    const generation = ++this._sendGeneration;
    this._notifySubscribers();

    // A send with nothing left to prepare goes out right away, as it always
    // has; only attachments still needing the adapter hold it back.
    const complete = attachments.filter(isAttachmentComplete);
    if (complete.length === attachments.length) {
      this._dispatchSubmission(generation, complete);
      return;
    }
    await this._prepareSubmission(generation);
  }

  private async _prepareSubmission(generation: number) {
    const adapter = this.getAttachmentAdapter();
    const uploads = (this._submission?.attachments ?? []).flatMap(
      (attachment) => {
        const upload = this._attachmentAddOperations.whenSendable(
          attachment.id,
        );
        return upload ? [upload] : [];
      },
    );
    if (uploads.length > 0) {
      // An attachment still uploading in `add()` cannot be finalized yet, so
      // the submission waits for its latest state.
      await Promise.all(uploads);
      if (generation !== this._sendGeneration) return;
      this._refreshSubmissionAttachments();
    }

    const submission = this._submission;
    const context = this._submissionSend;
    if (!submission || !context) return;

    const sent = submission.attachments.filter(
      (attachment) => !this._attachmentSends.isRemoved(attachment),
    );
    for (const attachment of sent) this._cancelAttachmentAdd(attachment.id);

    const settled = await Promise.allSettled(
      sent.map((attachment) =>
        this._attachmentSends.send(
          attachment,
          adapter,
          context.controller.signal,
        ),
      ),
    );
    if (generation !== this._sendGeneration) return;

    const rejection = settled.find((result) => result.status === "rejected");
    if (rejection) {
      this._returnSubmissionToDraft(sent, settled, rejection.reason);
      return;
    }

    // An attachment removed mid-upload can't be cancelled, but it can still be
    // dropped from the outgoing message instead of silently being sent anyway.
    const finalAttachments = settled.flatMap((result, index) =>
      this._attachmentSends.isRemoved(sent[index]!) ||
      result.status === "rejected"
        ? []
        : [result.value],
    );
    this._dispatchSubmission(generation, finalAttachments);
  }

  private _dispatchSubmission(
    generation: number,
    attachments: readonly CompleteAttachment[],
  ) {
    const submission = this._submission;
    const context = this._submissionSend;
    if (!submission || !context) return;

    const message: Omit<AppendMessage, "parentId" | "sourceId"> = {
      createdAt: new Date(),
      role: submission.role,
      content: submission.text ? [{ type: "text", text: submission.text }] : [],
      attachments,
      runConfig: context.runConfig,
      metadata: {
        custom: { ...(submission.quote ? { quote: submission.quote } : {}) },
      },
    };

    const dispatched = this.watchDispatch(submission.role);
    let sendTask: void | Promise<void>;
    try {
      sendTask = this.handleSend(message, context.options);
    } catch (error) {
      this._returnSubmissionToDraft([], [], error);
      return;
    }
    if (sendTask)
      void sendTask.catch((error) => {
        if (generation !== this._sendGeneration) return;
        this._restoreDispatchedSubmission(context.submission, error);
      });

    this._notifyEventSubscribers("send", {
      chars: submission.text.length,
      attachments: attachments.length,
    });

    // The submission stays on screen until the runtime shows the message it
    // was dispatched as, so the two never swap through an empty frame.
    this._submissionDispatched = true;
    this._notifySubscribers();
    this._submissionAck = dispatched(() => {
      if (generation !== this._sendGeneration) return;
      this._clearSubmission();
    });
  }

  private _refreshSubmissionAttachments() {
    const submission = this._submission;
    if (!submission) return;
    const attachments = submission.attachments.filter(
      (attachment) => !this._attachmentSends.isRemoved(attachment),
    );
    if (attachments.length === submission.attachments.length) return;
    this._submission = { ...submission, attachments };
  }

  private _returnSubmissionToDraft(
    sent: readonly Attachment[],
    settled: readonly PromiseSettledResult<CompleteAttachment>[],
    reason: unknown,
  ) {
    const submission = this._submission;
    if (!submission) return;

    const message = reason instanceof Error ? reason.message : String(reason);
    const failedIds = new Set(
      settled.flatMap((result, index) =>
        result.status === "rejected" ? [sent[index]!.id] : [],
      ),
    );
    // The attachment that could not be prepared carries the reason, so the
    // draft it returns to shows which file needs another try.
    const attachments = submission.attachments.map((attachment) =>
      failedIds.has(attachment.id) && !isAttachmentComplete(attachment)
        ? this._attachmentSends.transfer(attachment, {
            ...attachment,
            status: { type: "incomplete", reason: "error", message },
          })
        : attachment,
    );
    this._takeSubmissionBack({ ...submission, attachments });
    console.error("[assistant-ui] Failed to send attachments", reason);
  }

  private _restoreDispatchedSubmission(
    submission: ComposerSubmission,
    error: unknown,
  ) {
    if (!isMessageNotSentError(error)) return;
    this._takeSubmissionBack(submission);
  }

  private _clearSubmission() {
    this._clearSubmissionAck();
    this._submission = undefined;
    this._submissionSend = undefined;
    this._submissionDispatched = false;
    this._notifySubscribers();
  }

  private _clearSubmissionAck() {
    const ack = this._submissionAck;
    this._submissionAck = undefined;
    ack?.();
  }

  /**
   * Stops the submission and takes its content back into the draft, merging it
   * ahead of anything written since, so a send is never dropped.
   */
  protected cancelSubmission() {
    const submission = this._submission;
    if (!submission || !this.isSubmitting) return;
    this._submissionSend?.controller.abort();
    this._takeSubmissionBack(submission);
  }

  private _takeSubmissionBack(submission: ComposerSubmission) {
    this._sendGeneration++;
    this._clearSubmissionAck();
    this._submission = undefined;
    this._submissionSend = undefined;
    this._submissionDispatched = false;

    if (this.detachesDraftOnSend) {
      const kept = submission.attachments.filter(
        (attachment) => !this._attachmentSends.isRemoved(attachment),
      );
      this._attachments = [...kept, ...this._attachments];
      const text = this._text
        ? `${submission.text}\n${this._text}`
        : submission.text;
      this._text = text;
      this._rebaseDictation(text);
      this._quote = this._quote ?? submission.quote;
    }
    this._notifySubscribers();
  }

  private async _discardSubmission() {
    const submission = this._submission;
    if (!submission) return;

    this._sendGeneration++;
    this._submissionSend?.controller.abort();
    this._clearSubmission();

    const adapter = this.getAttachmentAdapter();
    if (!adapter) return;
    await Promise.all(
      submission.attachments
        .filter((attachment) => !isAttachmentComplete(attachment))
        .map(async (attachment) => adapter.remove(attachment)),
    );
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

  public cancel() {
    // A composer that keeps its draft while sending (an edit session) ends
    // that session here, so its submission must not dispatch afterwards.
    if (this.isSubmitting && !this.detachesDraftOnSend) {
      this._sendGeneration++;
      this._submissionSend?.controller.abort();
      this._clearSubmission();
    }
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
          fileOrAttachment.contentType,
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
      this._notifyEventSubscribers("attachmentAdd", {
        ...(a.contentType ? { contentType: a.contentType } : undefined),
      });
      return;
    }

    const adapter = this.getAttachmentAdapter();
    if (!adapter) {
      const message = "Attachments are not supported";
      const err = new Error(message);
      this._safeEmitAttachmentAddError(
        "no-adapter",
        message,
        undefined,
        err,
        fileOrAttachment.type,
      );
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
      this._safeEmitAttachmentAddError(
        "not-accepted",
        message,
        undefined,
        err,
        fileOrAttachment.type,
      );
      throw err;
    }

    const operation = this._attachmentAddOperations.start();
    const upsertAttachment = (a: PendingAttachment) => {
      if (!this._attachmentAddOperations.accept(operation, a)) return false;

      // An attachment the composer sent lives on the submission, so its
      // remaining upload updates follow it there instead of coming back as a
      // new draft entry.
      const submission = this._submission;
      const submitted =
        submission?.attachments.some((attachment) => attachment.id === a.id) ??
        false;
      if (submission && submitted) {
        this._submission = {
          ...submission,
          attachments: submission.attachments.map((attachment) =>
            attachment.id === a.id
              ? this._attachmentSends.transfer(attachment, a)
              : attachment,
          ),
        };
      }

      const idx = this._attachments.findIndex(
        (attachment) => attachment.id === a.id,
      );
      if (idx !== -1)
        this._attachments = [
          ...this._attachments.slice(0, idx),
          a,
          ...this._attachments.slice(idx + 1),
        ];
      else if (!submitted) {
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
        lastAttachment?.contentType || fileOrAttachment.type,
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
        undefined,
        lastAttachment.contentType || fileOrAttachment.type,
      );
    } else {
      this._notifyEventSubscribers("attachmentAdd", {
        ...(lastAttachment?.contentType
          ? { contentType: lastAttachment.contentType }
          : fileOrAttachment.type
            ? { contentType: fileOrAttachment.type }
            : undefined),
      });
    }
  }

  private _safeEmitAttachmentAddError(
    reason: AttachmentAddErrorReason,
    message: string,
    attachmentId?: string,
    error?: Error,
    contentType?: string,
  ) {
    try {
      this._notifyEventSubscribers("attachmentAddError", {
        reason,
        message,
        ...(attachmentId !== undefined && { attachmentId }),
        ...(error !== undefined && { error }),
        ...(contentType ? { contentType } : undefined),
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
    if (index === -1) {
      await this._removeSubmittedAttachment(attachmentId);
      return;
    }
    const attachment = this._attachments[index]!;

    this._cancelAttachmentAdd(attachmentId);

    // The mark must precede any await: an in-flight send drops the attachment
    // from its outgoing message, and a send that starts while the adapter
    // removal is still pending excludes it from the batch entirely.
    this._attachmentSends.markRemoved(attachment);

    if (!isAttachmentComplete(attachment)) {
      const adapter = this.getAttachmentAdapter();
      if (!adapter) throw new Error("Attachments are not supported");
      try {
        await adapter.remove(attachment);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this._attachments = this._attachments.map((candidate) =>
          candidate.id === attachmentId && !isAttachmentComplete(candidate)
            ? this._attachmentSends.transfer(candidate, {
                ...candidate,
                status: { type: "incomplete", reason: "error", message },
              })
            : candidate,
        );
        this._notifySubscribers();
        throw error;
      }
    }
    this._attachments = this._attachments.filter((a) => a.id !== attachmentId);
    this._notifySubscribers();
  }

  /**
   * A submission is not delivered yet, so an attachment can still be taken out
   * of it, which the draft no longer holds once the send detached it.
   */
  private async _removeSubmittedAttachment(attachmentId: string) {
    const submitted = this._submission?.attachments.find(
      (a) => a.id === attachmentId,
    );
    if (!submitted) throw new Error("Attachment not found");

    this._cancelAttachmentAdd(attachmentId);
    this._attachmentSends.markRemoved(submitted);
    if (!isAttachmentComplete(submitted)) {
      const adapter = this.getAttachmentAdapter();
      if (!adapter) throw new Error("Attachments are not supported");
      await adapter.remove(submitted);
    }
    const submission = this._submission;
    if (!submission) return;
    this._submission = {
      ...submission,
      attachments: submission.attachments.filter((a) => a.id !== attachmentId),
    };
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

    const isReplacing = this._dictationSession !== undefined;
    if (this._dictationSession) {
      const oldSession = this._dictationSession;
      this._cleanupDictation({ notify: false });
      this._stopDictationSession(oldSession);
    }

    const inputDisabled = adapter.disableInputDuringDictation ?? false;

    this._dictationBaseText = this._text;
    this._currentInterimText = "";

    let session: DictationAdapter.Session;
    try {
      session = adapter.listen();
    } catch (error) {
      if (isReplacing) {
        try {
          this._notifySubscribers();
        } catch (notifyError) {
          console.error(
            "[assistant-ui] Dictation replacement rollback notification threw",
            notifyError,
          );
        }
      }
      throw error;
    }
    this._dictationSession = session;
    const sessionId = ++this._dictationSessionIdCounter;
    this._activeDictationSessionId = sessionId;
    this._dictation = { status: session.status, inputDisabled };
    try {
      this._notifySubscribers();
    } catch (notifyError) {
      console.error(
        "[assistant-ui] Dictation start notification threw",
        notifyError,
      );
    }

    if (!this._isActiveSession(sessionId, session)) return;

    // Handles stay local because cleanup can run synchronously during setup
    // and would drain the shared list before the remaining handles exist.
    const setupUnsubscribes: Unsubscribe[] = [];
    const releaseSetup = () => {
      for (const unsubscribe of setupUnsubscribes.splice(0)) {
        try {
          unsubscribe();
        } catch (cleanupError) {
          console.error("[assistant-ui] Dictation cleanup threw", cleanupError);
        }
      }
    };
    const keepUnsubscribe = (unsubscribe: Unsubscribe) => {
      setupUnsubscribes.push(unsubscribe);
      if (this._isActiveSession(sessionId, session)) return true;
      releaseSetup();
      return false;
    };

    try {
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
      if (!keepUnsubscribe(unsubSpeech)) return;

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
      if (!keepUnsubscribe(unsubStart)) return;

      const unsubEnd = session.onSpeechEnd(() => {
        this._cleanupDictation({ sessionId });
      });
      if (!keepUnsubscribe(unsubEnd)) return;

      const statusInterval = setInterval(() => {
        if (!this._isActiveSession(sessionId, session)) return;

        if (session.status.type === "ended") {
          this._cleanupDictation({ sessionId });
        }
      }, 100);
      if (!keepUnsubscribe(() => clearInterval(statusInterval))) return;

      this._dictationUnsubscribes.push(...setupUnsubscribes.splice(0));
    } catch (error) {
      releaseSetup();
      if (this._isActiveSession(sessionId, session)) {
        try {
          session.cancel();
        } catch (cancelError) {
          console.error(
            "[assistant-ui] Dictation session cancel threw",
            cancelError,
          );
        } finally {
          this._cleanupDictation({ sessionId });
        }
      }
      throw error;
    }
  }

  public stopDictation(): void {
    if (!this._dictationSession) return;

    const session = this._dictationSession;
    const sessionId = this._activeDictationSessionId;
    const cleanup = () => this._cleanupDictation({ sessionId });
    this._stopDictationSession(session, cleanup);
  }

  private _stopDictationSession(
    session: DictationAdapter.Session,
    onSettled: () => void = () => {},
  ): void {
    let task: Promise<void>;
    try {
      task = session.stop();
    } catch (error) {
      console.error("[assistant-ui] Dictation session stop threw", error);
      onSettled();
      return;
    }

    void task.then(onSettled, (error) => {
      console.error("[assistant-ui] Dictation session stop rejected", error);
      onSettled();
    });
  }

  private _cleanupDictation(options?: {
    sessionId?: number | undefined;
    notify?: boolean | undefined;
  }): void {
    const isStaleSession =
      options?.sessionId !== undefined &&
      options.sessionId !== this._activeDictationSessionId;
    if (isStaleSession || this._isCleaningDictation) return;

    this._isCleaningDictation = true;
    const runCleanup = (cleanup: () => void) => {
      try {
        cleanup();
      } catch (error) {
        console.error("[assistant-ui] Dictation cleanup threw", error);
      }
    };

    try {
      const unsubscribes = this._dictationUnsubscribes;
      this._dictationUnsubscribes = [];
      this._dictationSession = undefined;
      this._activeDictationSessionId = undefined;
      this._dictation = undefined;
      this._dictationBaseText = "";
      this._currentInterimText = "";

      for (const unsubscribe of unsubscribes) runCleanup(unsubscribe);
      if (options?.notify !== false) {
        runCleanup(() => this._notifySubscribers());
      }
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

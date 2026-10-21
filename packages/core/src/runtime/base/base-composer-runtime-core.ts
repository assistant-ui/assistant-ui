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
  ComposerSetTextOptions,
  ComposerTextOrigin,
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
import { matchInTransit, retainInTransit } from "../utils/composer-submission";
import { DictationSessionController } from "./dictation-session";

type InTransit = {
  readonly submission: ComposerSubmission;
  readonly known: ReadonlySet<string>;
};

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
    return !this.text.trim() && !this.sendableAttachments.length;
  }

  protected get sendableAttachments() {
    return this.attachments.filter(
      (attachment) => !this._attachmentSends.isRemoved(attachment),
    );
  }

  private _text = "";
  private readonly _dictationSessionController = new DictationSessionController(
    {
      getAdapter: () => this.getDictationAdapter(),
      getText: () => this._text,
      setText: (value) => this._writeText(value, "user"),
      notify: () => this._notifySubscribers(),
    },
  );

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

  public setText(value: string, options?: ComposerSetTextOptions) {
    if (this._text === value) return;

    this._writeText(value, options?.origin ?? "external");
    this._rebaseDictation(value);
    this._notifySubscribers();
  }

  private _pendingTextChanges: ComposerRuntimeEventPayload["textChange"][] = [];
  private _isFlushingTextChanges = false;

  private _writeText(value: string, origin: ComposerTextOrigin) {
    if (this._text === value) return;

    this._text = value;
    this._pendingTextChanges.push({ text: value, origin });
  }

  protected override _notifySubscribers() {
    try {
      super._notifySubscribers();
    } finally {
      this._flushTextChanges();
    }
  }

  private _flushTextChanges() {
    if (this._isFlushingTextChanges) return;

    this._isFlushingTextChanges = true;
    for (
      let change = this._pendingTextChanges.shift();
      change;
      change = this._pendingTextChanges.shift()
    )
      this._notifyEventSubscribers("textChange", change);
    this._isFlushingTextChanges = false;
  }

  private _rebaseDictation(value: string) {
    this._dictationSessionController.rebase(value);
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
        readonly options: SendOptions | undefined;
        readonly runConfig: RunConfig;
        readonly controller: AbortController;
      }
    | undefined;
  private _inTransit: readonly InTransit[] = [];
  private _inTransitSubmissions: readonly ComposerSubmission[] = [];
  private _sendGeneration = 0;
  private _draftEpoch = 0;
  private _attachmentAddOperations = new AttachmentAddOperations();
  private _attachmentSends = new AttachmentSendOperations();

  public get submission() {
    return this._submission;
  }

  public get inTransit() {
    return this._inTransitSubmissions;
  }

  /** Whether a send is still being prepared, which holds the composer. */
  protected get isSubmitting() {
    return this._submission !== undefined;
  }

  /** Whether a send takes the draft with it, leaving the composer free. */
  protected get detachesDraftOnSend(): boolean {
    return true;
  }

  /**
   * The ids of the thread's messages of a role, or undefined when this
   * composer's sends do not render in the thread. A dispatched submission
   * stays in transit until a message of its role that was not there at
   * dispatch shows up.
   */
  protected threadMessageIds(
    _role: MessageRole,
  ): readonly string[] | undefined {
    return undefined;
  }

  /**
   * Releases the messages in transit that the thread now shows. Each new
   * message stands in for the oldest send still waiting for one, and only
   * once, so sends made in quick succession hand over in order.
   */
  protected settleInTransit() {
    if (this._inTransit.length === 0) return;
    const match = matchInTransit(this._inTransit, (entry) =>
      this.threadMessageIds(entry.submission.role),
    );
    if (match.landed.size === 0) return;
    this._setInTransit(retainInTransit(this._inTransit, match));
    this._notifySubscribers();
  }

  private _setInTransit(entries: readonly InTransit[]) {
    this._inTransit = entries;
    this._inTransitSubmissions = entries.map((entry) => entry.submission);
  }

  private _leaveTransit(submission: ComposerSubmission) {
    const remaining = this._inTransit.filter(
      (entry) => entry.submission !== submission,
    );
    if (remaining.length === this._inTransit.length) return false;
    this._setInTransit(remaining);
    return true;
  }

  private _cancelAttachmentAdd(attachmentId: string) {
    this._attachmentAddOperations.cancel(attachmentId);
  }

  private _cancelAllAttachmentAdds() {
    this._attachmentAddOperations.cancelAll();
  }

  private _emptyTextAndAttachments() {
    this._attachments = [];
    this._writeText("", "reset");
    this._rebaseDictation("");
    this._notifySubscribers();
  }

  private _draftUploadsToRemove() {
    return this._attachments.filter(
      (a) =>
        !isAttachmentComplete(a) &&
        this._attachmentSends.shouldRemoveOnClear(a),
    );
  }

  private async _onClearAttachments(pending: readonly Attachment[]) {
    const adapter = this.getAttachmentAdapter();
    if (!adapter) return;
    await Promise.all(
      pending.map((attachment) => {
        this._attachmentSends.beginRemoval(attachment);
        return this._attachmentSends.remove(attachment, adapter);
      }),
    );
  }

  public async reset() {
    this._cancelAllAttachmentAdds();
    this._draftEpoch++;

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

    const task = this._onClearAttachments(this._draftUploadsToRemove());
    this._emptyTextAndAttachments();
    await Promise.all([task, discarded]);
  }

  public async clearAttachments() {
    this._draftEpoch++;
    // A send that detached the draft holds the submission's attachments, so
    // their uploads keep going for it.
    this._attachmentAddOperations.cancelAll(
      this.detachesDraftOnSend
        ? new Set(
            this._submission?.attachments.map((attachment) => attachment.id),
          )
        : undefined,
    );
    // Taken before the marks below, which would read as pending removals.
    const pending = this._draftUploadsToRemove();
    if (this.isSubmitting) {
      for (const attachment of this._attachments)
        this._attachmentSends.beginRemoval(attachment);
    }
    const task = this._onClearAttachments(pending);
    this.setAttachments([]);

    await task;
  }

  public async send(options?: SendOptions) {
    if (!this.canSend || this.isSubmitting) return;

    this._dictationSessionController.cancel();

    // An attachment whose removal is still awaiting the adapter is excluded
    // up front, or a send started mid-removal would upload and dispatch it.
    const attachments = this.sendableAttachments;
    if (!this.text.trim() && attachments.length === 0) return;

    const draft: ComposerSubmission = {
      id: generateId(),
      role: this.role,
      text: this.text,
      quote: this._quote,
      attachments,
    };
    const context = { options, runConfig: this.runConfig };
    // Only a send whose attachments still need the adapter becomes a
    // submission; one with nothing left to prepare goes out right away, as it
    // always has, and never shows up as a row of its own.
    const complete = attachments.filter(isAttachmentComplete);
    const ready = complete.length === attachments.length;
    if (!ready) {
      this._submission = draft;
      this._submissionSend = { ...context, controller: new AbortController() };
    }
    if (this.detachesDraftOnSend) {
      const detached = new Set(attachments);
      this._attachments = this._attachments.filter((a) => !detached.has(a));
      this._writeText("", "send");
      this._rebaseDictation("");
      this._quote = undefined;
    }
    const generation = ++this._sendGeneration;
    this._notifySubscribers();

    if (ready) {
      this._dispatch(generation, draft, complete, context, false);
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
    const submitted = this._submission ?? submission;
    if (!submitted.text.trim() && finalAttachments.length === 0) {
      this._endSubmission();
      this._returnToDraft(submitted);
      return;
    }
    this._dispatch(generation, submitted, finalAttachments, context, true);
  }

  private _dispatch(
    generation: number,
    draft: ComposerSubmission,
    attachments: readonly CompleteAttachment[],
    context: { options: SendOptions | undefined; runConfig: RunConfig },
    isSubmission: boolean,
  ) {
    const message: Omit<AppendMessage, "parentId" | "sourceId"> = {
      createdAt: new Date(),
      role: draft.role,
      content: draft.text ? [{ type: "text", text: draft.text }] : [],
      attachments,
      runConfig: context.runConfig,
      metadata: {
        custom: { ...(draft.quote ? { quote: draft.quote } : {}) },
      },
    };

    const sent: ComposerSubmission = { ...draft, attachments };
    const completed = new Map(
      draft.attachments
        .filter((attachment) => !this._attachmentSends.isRemoved(attachment))
        .map((attachment, index) => [attachment, attachments[index]] as const),
    );
    const returned: ComposerSubmission = {
      ...draft,
      attachments: draft.attachments.map(
        (attachment) => completed.get(attachment) ?? attachment,
      ),
    };
    const queued = this.queue.length;
    if (isSubmission) {
      // The runtime owns the message from here, so neither a reset nor the
      // next send can reach it, and the thread shows it until the runtime does.
      this._submission = undefined;
      this._submissionSend = undefined;
      // A composer that kept its draft holds the same attachments, which are
      // the delivered ones now, so clearing that draft (an edit ending) must
      // not remove their uploads.
      if (!this.detachesDraftOnSend) {
        const delivered = new Map(
          draft.attachments.map((attachment, index) => [
            attachment.id,
            returned.attachments[index]!,
          ]),
        );
        this._attachments = this._attachments.map(
          (attachment) => delivered.get(attachment.id) ?? attachment,
        );
      }
      const known = this.threadMessageIds(draft.role);
      if (known)
        this._setInTransit([
          ...this._inTransit,
          { submission: sent, known: new Set(known) },
        ]);
    }

    const cleanupOwner = this.cleanupOwner;
    const cleanupEpoch = cleanupOwner._draftEpoch;
    let sendTask: void | Promise<void>;
    try {
      sendTask = this.handleSend(message, context.options);
    } catch (error) {
      console.error("[assistant-ui] Failed to send the message", error);
      this._leaveTransit(sent);
      if (generation === this._sendGeneration) this._returnToDraft(returned);
      else this._notifySubscribers();
      return;
    }
    if (sendTask)
      void sendTask.catch((error) => {
        const wasInTransit = this._leaveTransit(sent);
        if (generation === this._sendGeneration && isMessageNotSentError(error))
          this._returnToDraft(returned);
        else if (wasInTransit) this._notifySubscribers();
      });

    if (isSubmission)
      for (const attachment of draft.attachments)
        if (!isAttachmentComplete(attachment))
          this._attachmentSends.dispatchRemoval(
            attachment,
            () =>
              void this._retrySubmittedRemoval(
                attachment as PendingAttachment,
                cleanupOwner,
                cleanupEpoch,
              ),
          );

    this._notifyEventSubscribers("send", {
      chars: draft.text.length,
      attachments: attachments.length,
    });

    if (!isSubmission) return;
    // A queued message has its own place in the UI.
    if (this.queue.length > queued) this._leaveTransit(sent);
    this._notifySubscribers();
    this.settleInTransit();
  }

  private _returnSubmissionToDraft(
    sent: readonly Attachment[],
    settled: readonly PromiseSettledResult<CompleteAttachment>[],
    reason: unknown,
  ) {
    const submission = this._submission;
    if (!submission) return;

    const attachments = this._attachmentSends.reconcileFailures(
      submission.attachments,
      sent,
      settled,
    );
    this._endSubmission();
    this._returnToDraft({ ...submission, attachments });
    console.error("[assistant-ui] Failed to send attachments", reason);
  }

  /** Ends the send being prepared, so nothing it started can dispatch it. */
  private _endSubmission() {
    this._sendGeneration++;
    this._submission = undefined;
    this._submissionSend = undefined;
  }

  /** Drops the send being prepared without returning it to the draft, for a thread runtime disposed for good. */
  public __internal_dispose() {
    this._cancelAllAttachmentAdds();
    if (!this._submission) return;
    this._submissionSend?.controller.abort();
    this._endSubmission();
    this._notifySubscribers();
  }

  /**
   * Stops the submission and takes its content back into the draft, merging it
   * ahead of anything written since, so a send is never dropped.
   */
  protected cancelSubmission() {
    const submission = this._submission;
    if (!submission) return;
    this._submissionSend?.controller.abort();
    this._endSubmission();
    this._returnToDraft(submission);
  }

  /**
   * Takes a send's content back into the draft, ahead of anything written
   * since. A composer that kept its draft only takes back the state the
   * attachments came back in, such as the reason one failed, and leaves an
   * attachment being removed to its removal.
   */
  private _returnToDraft(submission: ComposerSubmission) {
    if (this.detachesDraftOnSend) {
      const returned = submission.attachments.flatMap((attachment) => {
        const restored = this._attachmentSends.restoreUnsent(attachment);
        return restored ? [restored] : [];
      });
      this._attachments = [...returned, ...this._attachments];
      const text = [submission.text, this._text].filter(Boolean).join("\n");
      this._writeText(text, "return");
      this._rebaseDictation(text);
      this._quote = this._quote ?? submission.quote;
    } else {
      const returned = new Map(
        submission.attachments.flatMap((attachment) => {
          const restored = this._attachmentSends.restoreUnsent(attachment);
          return restored ? [[attachment.id, restored] as const] : [];
        }),
      );
      this._attachments = this._attachments.flatMap((attachment) => {
        const restored = this._attachmentSends.restoreUnsent(attachment);
        return restored ? [returned.get(attachment.id) ?? restored] : [];
      });
    }
    this._notifySubscribers();
  }

  private async _discardSubmission() {
    const submission = this._submission;
    if (!submission) return;

    this._submissionSend?.controller.abort();
    this._endSubmission();
    this._notifySubscribers();

    const adapter = this.getAttachmentAdapter();
    if (!adapter) return;
    // An attachment the draft still holds is removed along with the draft.
    const drafted = new Set(
      this._attachments.map((attachment) => attachment.id),
    );
    await Promise.all(
      submission.attachments
        .filter(
          (attachment) =>
            !isAttachmentComplete(attachment) &&
            !drafted.has(attachment.id) &&
            !this._attachmentSends.isRemovalPending(attachment),
        )
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

    this._writeText(draft.text, "return");
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

    this._writeText("", "external");
    this._rebaseDictation("");
    this._quote = undefined;
    this._attachments = [];
    this._notifySubscribers();
  }

  public cancel() {
    // A composer that keeps its draft while sending (an edit session) ends
    // that session here, so its submission must not dispatch afterwards.
    if (this.isSubmitting && !this.detachesDraftOnSend) {
      this._submissionSend?.controller.abort();
      this._endSubmission();
      this._notifySubscribers();
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
    const attachment =
      this._attachments.find((candidate) => candidate.id === attachmentId) ??
      this._submission?.attachments.find(
        (candidate) => candidate.id === attachmentId,
      );
    if (!attachment) throw new Error("Attachment not found");
    const adapter = this.getAttachmentAdapter();
    if (!isAttachmentComplete(attachment) && !adapter)
      throw new Error("Attachments are not supported");
    if (!this._attachmentSends.beginRemoval(attachment)) return;

    this._cancelAttachmentAdd(attachmentId);
    this._notifySubscribers();

    await this._attachmentSends.remove(
      attachment,
      adapter,
      (_error, message) => {
        const fail = (candidate: PendingAttachment) =>
          this._attachmentSends.transfer(candidate, {
            ...candidate,
            status: { type: "incomplete", reason: "error", message },
          });
        const submission = this._submission;
        if (submission)
          this._submission = {
            ...submission,
            attachments: submission.attachments.map((candidate) =>
              !isAttachmentComplete(candidate) &&
              this._attachmentSends.isSameRemoval(candidate, attachment)
                ? fail(candidate)
                : candidate,
            ),
          };
        if (
          this._attachments.some((candidate) =>
            this._attachmentSends.isSameRemoval(candidate, attachment),
          )
        ) {
          this._attachments = this._attachments.map((candidate) =>
            !isAttachmentComplete(candidate) &&
            this._attachmentSends.isSameRemoval(candidate, attachment)
              ? fail(candidate)
              : candidate,
          );
          if (!this._submission)
            this._attachments = this._attachments.map((candidate) =>
              this._attachmentSends.isSameRemoval(candidate, attachment)
                ? this._attachmentSends.restore(candidate)
                : candidate,
            );
        }
        this._notifySubscribers();
      },
    );
    const submission = this._submission;
    if (submission)
      this._submission = {
        ...submission,
        attachments: submission.attachments.filter(
          (candidate) =>
            !this._attachmentSends.isSameRemoval(candidate, attachment),
        ),
      };
    if (
      this._attachments.some((candidate) =>
        this._attachmentSends.isSameRemoval(candidate, attachment),
      )
    )
      this._attachments = this._attachments.filter(
        (candidate) =>
          !this._attachmentSends.isSameRemoval(candidate, attachment),
      );
    this._notifySubscribers();
  }

  protected get cleanupOwner(): BaseComposerRuntimeCore {
    return this;
  }

  private _adoptCleanupFailure(
    source: AttachmentSendOperations,
    failed: PendingAttachment,
    epoch: number,
  ) {
    if (this._draftEpoch !== epoch) return;
    if (this._attachments.some((attachment) => attachment.id === failed.id))
      return;
    this._attachmentSends.adoptFrom(source, failed);
    this._attachments = [failed, ...this._attachments];
    this._notifySubscribers();
  }

  private async _retrySubmittedRemoval(
    submitted: PendingAttachment,
    owner: BaseComposerRuntimeCore,
    epoch: number,
  ) {
    this._attachmentSends.beginRemoval(submitted);
    await this._attachmentSends
      .remove(submitted, this.getAttachmentAdapter(), (error, message) => {
        console.error("[assistant-ui] Failed to remove sent attachment", error);
        const failed = this._attachmentSends.transfer(submitted, {
          ...submitted,
          status: { type: "incomplete", reason: "error", message },
        });
        owner._adoptCleanupFailure(this._attachmentSends, failed, epoch);
      })
      .catch(() => {});
  }

  public get dictation(): DictationState | undefined {
    return this._dictationSessionController.dictation;
  }

  public startDictation(): void {
    this._dictationSessionController.startDictation();
  }

  public stopDictation(): void {
    this._dictationSessionController.stopDictation();
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

  /** @deprecated Experimental since 2024-10-12. Not scheduled for removal; the API may change in any release. */
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

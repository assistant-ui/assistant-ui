import {
  fromThreadMessageLike,
  type ThreadMessageLike,
} from "../../runtime/utils/thread-message-like";
import { generateId } from "../../utils/id";
import type {
  ChatModelAdapter,
  ChatModelRunResult,
} from "../../runtime/utils/chat-model-adapter";
import { shouldContinue } from "./should-continue";
import type { LocalRuntimeOptionsBase } from "./local-runtime-options";
import { consumeSuggestionResult } from "../../adapters/suggestion";
import type {
  AddToolResultOptions,
  ResumeToolCallOptions,
  RespondToToolApprovalOptions,
  ThreadSuggestion,
  ThreadRuntimeCore,
  StartRunConfig,
  ResumeRunConfig,
} from "../../runtime/interfaces/thread-runtime-core";
import { BaseThreadRuntimeCore } from "../../runtime/base/base-thread-runtime-core";
import type {
  AppendMessage,
  ThreadAssistantMessage,
  ThreadMessage,
} from "../../types/message";
import type { Attachment, CompleteAttachment } from "../../types/attachment";
import type { RunConfig } from "../../types/message";
import type { QuoteInfo } from "../../types/quote";
import { getThreadMessageText } from "../../utils/text";
import { toAssistantError } from "../../types/error";
import type { ModelContextProvider } from "../../model-context/types";
import {
  createMessageQueue,
  type MessageQueueController,
} from "../../runtime/queue/message-queue";
import type { QueuePlacement } from "../../runtime/queue/external-thread-queue-adapter";
import {
  EMPTY_QUEUE_ITEMS,
  type QueueItemState,
} from "../../store/scopes/queue-item";
import { setOptimisticAttachmentSend } from "../../runtime/utils/optimistic-attachment-send";
import {
  captureThreadRuntimeGeneration,
  invalidateThreadRuntime,
  isThreadRuntimeGenerationCurrent,
} from "../../runtime/utils/thread-runtime-lifecycle";

class AbortError extends Error {
  override name = "AbortError";
  detach: boolean;

  constructor(detach: boolean, message?: string) {
    super(message);
    this.detach = detach;
  }
}

export class LocalThreadRuntimeCore
  extends BaseThreadRuntimeCore
  implements ThreadRuntimeCore
{
  public readonly capabilities = {
    switchToBranch: true,
    switchBranchDuringRun: true,
    edit: true,
    delete: false,
    reload: true,
    refetchThread: false,
    cancel: true,
    unstable_copy: true,
    speech: false,
    dictation: false,
    voice: false,
    attachments: false,
    feedback: false,
    queue: false,
  };

  private abortController: AbortController | null = null;

  private _queue: MessageQueueController | null = null;
  private _queueRunInFlight = false;
  private _activeRun: { cancelled: boolean } | null = null;
  private _runGeneration = 0;

  private _historyWrites = new Map<string, Promise<void>>();

  private _pendingAttachmentSend: Promise<void> | null = null;
  private _attachmentSendReleased: Promise<void> | null = null;
  private _releaseAttachmentSend: (() => void) | null = null;

  // `AttachmentAdapter.send` takes no abort signal, so an upload that never
  // settles cannot be cancelled — but the ordering it holds must stay
  // releasable, or every append behind it waits with no way out. A release
  // only unblocks waiters and queued sends; the stalled send itself is not
  // invalidated, matching the lock path where a send that settles after a
  // cancelled run still appends and starts its run.
  private _awaitAttachmentSend(pending: Promise<void>): Promise<void> {
    this._attachmentSendReleased ??= new Promise<void>((resolve) => {
      this._releaseAttachmentSend = resolve;
    });
    return Promise.race([pending, this._attachmentSendReleased]);
  }

  private _releasePendingAttachmentSend(): void {
    if (!this._pendingAttachmentSend) return;
    this._pendingAttachmentSend = null;
    this._releaseAttachmentSend?.();
    this._attachmentSendReleased = null;
    this._releaseAttachmentSend = null;
  }

  // An optimistic attachment send holds the thread tail until its upload
  // settles: a message sent meanwhile is appended immediately but must not
  // persist or run ahead of the parent it was appended under.
  private _chainAttachmentSend(work: () => Promise<void>): Promise<void> {
    const previous = this._pendingAttachmentSend
      ? this._awaitAttachmentSend(this._pendingAttachmentSend)
      : Promise.resolve();
    const next = previous.then(work, work);
    const stored = next.then(
      () => {},
      () => {},
    );
    this._pendingAttachmentSend = stored;
    void stored.then(() => {
      if (this._pendingAttachmentSend === stored) {
        this._pendingAttachmentSend = null;
      }
    });
    return next;
  }

  private async _waitForAttachmentSendChain(): Promise<void> {
    while (this._pendingAttachmentSend) {
      await this._awaitAttachmentSend(this._pendingAttachmentSend);
    }
  }

  private _isAncestorOfHead(messageId: string): boolean {
    for (
      let currentId = this.repository.headId;
      currentId !== null;
      currentId = this.repository.getMessage(currentId).parentId
    ) {
      if (currentId === messageId) return true;
    }
    return false;
  }

  // Writes for one message id must land in issue order; an earlier paused
  // snapshot arriving after the terminal write would resurrect the pause.
  private _chainHistoryWrite(
    id: string,
    write: () => Promise<void>,
  ): Promise<void> {
    const next = (this._historyWrites.get(id) ?? Promise.resolve()).then(
      write,
      write,
    );
    const stored = next.then(
      () => {},
      () => {},
    );
    this._historyWrites.set(id, stored);
    void stored.then(() => {
      if (this._historyWrites.get(id) === stored) {
        this._historyWrites.delete(id);
      }
    });
    return next;
  }

  // A decision recorded on a still-paused message must reach history before
  // the run resumes, or a refresh would restore the message without it.
  private _persistPausedMessage(
    parentId: string | null,
    message: ThreadAssistantMessage,
  ) {
    if (message.status?.type !== "requires-action") return;
    const history = this._options.adapters.history;
    if (!history?.update) return;
    const update = history.update.bind(history);
    const item = { parentId, message, runConfig: this._lastRunConfig };
    this._chainHistoryWrite(message.id, () => update(item)).catch(() => {});
  }

  public readonly isDisabled = false;
  public readonly isSendDisabled = false;

  private _isLoading = false;
  public get isLoading() {
    return this._isLoading;
  }

  private _suggestions: readonly ThreadSuggestion[] = [];
  private _suggestionsController: AbortController | null = null;
  public get suggestions(): readonly ThreadSuggestion[] {
    return this._suggestions;
  }

  public get adapters() {
    return this._options.adapters;
  }

  constructor(
    contextProvider: ModelContextProvider,
    options: LocalRuntimeOptionsBase,
  ) {
    super(contextProvider);
    this.__internal_setOptions(options);
    setOptimisticAttachmentSend(this, (message, uploadAttachments) =>
      this.appendOptimisticAttachmentSend(message, uploadAttachments),
    );
  }

  private _options!: LocalRuntimeOptionsBase;

  private _lastRunConfig: RunConfig = {};

  private _getThreadId?: () => string | undefined;

  public __internal_setGetThreadId(getThreadId: () => string | undefined) {
    this._getThreadId = getThreadId;
  }

  private _getInitializePromise?: () => Promise<unknown> | undefined;

  public __internal_setGetInitializePromise(
    getPromise: () => Promise<unknown> | undefined,
  ) {
    this._getInitializePromise = getPromise;
  }

  public get extras() {
    return undefined;
  }

  public __internal_setOptions(options: LocalRuntimeOptionsBase) {
    if (this._options === options) return;

    this._options = options;

    let hasUpdates = false;

    const canSpeak = options.adapters?.speech !== undefined;
    if (this.capabilities.speech !== canSpeak) {
      this.capabilities.speech = canSpeak;
      hasUpdates = true;
    }

    const canDictate = options.adapters?.dictation !== undefined;
    if (this.capabilities.dictation !== canDictate) {
      this.capabilities.dictation = canDictate;
      hasUpdates = true;
    }

    const canVoice = options.adapters?.voice !== undefined;
    if (this.capabilities.voice !== canVoice) {
      this.capabilities.voice = canVoice;
      hasUpdates = true;
    }

    const canAttach = options.adapters?.attachments !== undefined;
    if (this.capabilities.attachments !== canAttach) {
      this.capabilities.attachments = canAttach;
      hasUpdates = true;
    }

    const canFeedback = options.adapters?.feedback !== undefined;
    if (this.capabilities.feedback !== canFeedback) {
      this.capabilities.feedback = canFeedback;
      hasUpdates = true;
    }

    const canDelete = options.adapters?.history?.delete !== undefined;
    if (this.capabilities.delete !== canDelete) {
      this.capabilities.delete = canDelete;
      hasUpdates = true;
    }

    const canQueue = options.unstable_enableMessageQueue === true;
    if (canQueue && !this._queue) {
      this._queue = createMessageQueue({
        run: (message) => {
          // release the queue when the dispatch settles, even if it rejects
          // before reaching startRun's finally, so a failure can't deadlock it
          this._queueRunInFlight = true;
          const generation = this._runGeneration;
          // the tail may have moved since the message was enqueued
          void this._runAppend({
            ...message,
            parentId: this.messages.at(-1)?.id ?? null,
          })
            .finally(() => {
              this._queueRunInFlight = false;
              // a dispatch that failed before starting a run settles here;
              // runs that did start release from _runLoop
              if (this._runGeneration === generation) this._queue?.notifyIdle();
            })
            .catch(() => {});
        },
      });
      this._queue.subscribe(() => this._notifySubscribers());
    } else if (!canQueue && this._queue) {
      this._queue = null;
    }
    if (this.capabilities.queue !== canQueue) {
      this.capabilities.queue = canQueue;
      hasUpdates = true;
    }

    if (hasUpdates) this._notifySubscribers();
  }

  private _loadPromise: Promise<void> | undefined;
  public __internal_load() {
    if (this._loadPromise) return this._loadPromise;

    const promise = this.adapters.history?.load() ?? Promise.resolve(null);

    this._isLoading = true;
    this._notifySubscribers();

    this._loadPromise = promise
      .then((repo) => {
        if (!repo) return;
        this.repository.import(repo);
        if (repo.messages.length > 0) {
          this.ensureInitialized();
        }
        this._notifySubscribers();

        const resume = this.adapters.history?.resume?.bind(
          this.adapters.history,
        );
        if (repo.unstable_resume && resume) {
          this.startRun(
            {
              parentId: this.repository.headId,
              sourceId: this.repository.headId,
              runConfig: this._lastRunConfig,
            },
            resume,
          ).catch(() => {});
        }
      })
      .finally(() => {
        this._isLoading = false;
        this._notifySubscribers();
      });

    return this._loadPromise;
  }

  public async append(message: AppendMessage): Promise<void> {
    const isTail = message.parentId === (this.messages.at(-1)?.id ?? null);
    const willRun = message.startRun ?? message.role === "user";
    if (this._queue && willRun && isTail) {
      if (message.steer ?? this._queueRunInFlight)
        this._queue.adapter.steer(message);
      else this._queue.adapter.enqueue(message);
      return;
    }
    if (
      this._queue &&
      !isTail &&
      (this._options.unstable_queueClearOnRewind ?? true)
    )
      this._queue.clear();
    return this._runAppend(message);
  }

  public getQueueItems(): readonly QueueItemState[] {
    // Reads can arrive during base-thread construction, before the queue field
    // is assigned, so guard against the unset field.
    return this._queue?.adapter.items ?? EMPTY_QUEUE_ITEMS;
  }

  public getSteerQueueItems(): readonly QueueItemState[] {
    return this._queue?.adapter.steerItems ?? EMPTY_QUEUE_ITEMS;
  }

  public moveQueueItem(queueItemId: string, placement: QueuePlacement): void {
    this._queue?.adapter.move(queueItemId, placement);
  }

  public removeQueueItem(queueItemId: string): void {
    this._queue?.adapter.remove(queueItemId);
  }

  private async _runAppend(rawMessage: AppendMessage): Promise<void> {
    // Stamped here rather than in `append` so a queued message is gated after
    // the flush re-pointed its parentId at the current tail.
    const generation = captureThreadRuntimeGeneration(this);
    const message = this.enrichAppendMetadata(rawMessage);
    this.ensureInitialized();

    const initPromise = this._getInitializePromise?.();
    if (initPromise) {
      await initPromise;
    }
    if (!isThreadRuntimeGenerationCurrent(this, generation)) return;

    const newMessage = fromThreadMessageLike(message, generateId(), {
      type: "complete",
      reason: "unknown",
    });
    this.repository.addOrUpdateMessage(message.parentId, newMessage);

    const pendingAttachmentSend = this._pendingAttachmentSend;
    if (pendingAttachmentSend) {
      this._notifySubscribers();
      await this._awaitAttachmentSend(pendingAttachmentSend);
      // This await is unbounded: it lasts as long as the upload ahead of it.
      if (!isThreadRuntimeGenerationCurrent(this, generation)) return;
    }

    // A rolled back optimistic parent relinks its children, so the persisted
    // parent is the one the repository ended up with, not the requested one.
    const parentId = this.repository.getMessage(newMessage.id).parentId;
    this._options.adapters.history?.append({
      parentId,
      message: newMessage,
      ...(message.runConfig !== undefined && { runConfig: message.runConfig }),
    });

    const startRun = message.startRun ?? message.role === "user";
    if (startRun) {
      await this.startRun({
        parentId: newMessage.id,
        sourceId: message.sourceId,
        runConfig: message.runConfig ?? {},
      });
    } else {
      this.repository.resetHead(newMessage.id);
      this._notifySubscribers();
    }
  }

  private async appendOptimisticAttachmentSend(
    rawMessage: AppendMessage,
    uploadAttachments: () => Promise<readonly CompleteAttachment[]>,
  ): Promise<void> {
    if (rawMessage.role !== "user")
      throw new Error("Attachments are only supported for user messages.");

    // Stamped on the placeholder rather than on the completed message so the
    // gate reads the branch prefix the send was composed against, matching
    // `_runAppend`.
    const message = this.enrichAppendMetadata(rawMessage);
    const generation = captureThreadRuntimeGeneration(this);
    this.ensureInitialized();
    const initPromise = this._getInitializePromise?.();

    // A pending attachment carries no content until its upload completes.
    const optimisticAttachments = (
      (message.attachments ?? []) as readonly Attachment[]
    ).map((attachment) =>
      attachment.status.type === "complete"
        ? attachment
        : {
            ...attachment,
            content: attachment.content ?? [],
            status: {
              type: "running" as const,
              reason: "uploading" as const,
              progress: 0,
            },
          },
    );
    const optimisticMessage = fromThreadMessageLike(
      {
        ...message,
        attachments: optimisticAttachments as ThreadMessageLike["attachments"],
      },
      generateId(),
      { type: "complete", reason: "unknown" },
    );
    this.repository.addOrUpdateMessage(message.parentId, optimisticMessage);
    this._notifySubscribers();

    await this._chainAttachmentSend(async () => {
      let attachments: readonly CompleteAttachment[];
      try {
        if (initPromise) await initPromise;
        attachments = await uploadAttachments();
      } catch (e) {
        this.repository.deleteMessage(optimisticMessage.id);
        this._notifySubscribers();
        throw e;
      }
      if (!isThreadRuntimeGenerationCurrent(this, generation)) return;

      // A message removed mid-upload (deleteMessage, a thread reset or import
      // that cleared the repository) has nowhere to land. The composer was
      // emptied at dispatch, so the uploaded draft is offered back to it
      // rather than dropped without a message or an error.
      let parentId: string | null;
      try {
        parentId = this.repository.getMessage(optimisticMessage.id).parentId;
      } catch {
        this.composer.restoreDraft({
          text: getThreadMessageText(optimisticMessage),
          attachments,
          quote: optimisticMessage.metadata.custom?.["quote"] as
            | QuoteInfo
            | undefined,
        });
        return;
      }
      // A head moved off this message's branch mid-upload (regenerate, branch
      // switch) re-parents the completed message under the current tail, so it
      // lands and persists where a post-upload append would have.
      if (!this._isAncestorOfHead(optimisticMessage.id)) {
        parentId = this.repository.headId;
      }
      const completedMessage = {
        ...optimisticMessage,
        attachments,
      } as ThreadMessage;
      this.repository.addOrUpdateMessage(parentId, completedMessage);
      this._notifySubscribers();
      // The append stays awaited so a send queued behind this one persists
      // after it, but its failure must not abort the run decision below.
      try {
        await this._options.adapters.history?.append({
          parentId,
          message: completedMessage,
          ...(message.runConfig !== undefined && {
            runConfig: message.runConfig,
          }),
        });
      } catch {}
    });

    await this._waitForAttachmentSendChain();
    if (!isThreadRuntimeGenerationCurrent(this, generation)) return;

    if (this.repository.headId !== optimisticMessage.id) {
      // A message sent during the upload already sits below this one and owns
      // the run; a run parented here would branch the thread and hide it.
      if (this._isAncestorOfHead(optimisticMessage.id)) return;
      try {
        this.repository.getMessage(optimisticMessage.id);
      } catch {
        return;
      }
      this.repository.switchToBranch(optimisticMessage.id);
      this._notifySubscribers();
      if (this.repository.headId !== optimisticMessage.id) return;
    }

    const startRun = message.startRun ?? true;
    if (startRun) {
      await this.startRun({
        parentId: optimisticMessage.id,
        sourceId: message.sourceId,
        runConfig: message.runConfig ?? {},
      });
    } else {
      this.repository.resetHead(optimisticMessage.id);
      this._notifySubscribers();
    }
  }

  public async deleteMessage(messageId: string): Promise<void> {
    const adapter = this._options.adapters.history;
    if (!adapter?.delete)
      throw new Error("Runtime does not support deleting messages.");

    const messages = this.repository.getMessages();
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) throw new Error("Message not found.");

    const message = messages[messageIndex]!;
    const parentId = messages[messageIndex - 1]?.id ?? null;
    const items = [{ parentId, message }];

    await adapter.delete(items);

    this.repository.deleteMessage(messageId);
    this._notifySubscribers();
  }

  public resumeRun({ stream, ...startConfig }: ResumeRunConfig): Promise<void> {
    if (!stream)
      throw new Error("You must pass a stream parameter to resume runs.");
    return this.startRun(startConfig, stream);
  }

  public exportExternalState(): any {
    throw new Error("Runtime does not support exporting external states.");
  }

  public importExternalState(): void {
    throw new Error("Runtime does not support importing external states.");
  }

  public unstable_notifySessionReset(): void {
    throw new Error("Runtime does not support resetting sessions.");
  }

  public async startRun(
    { parentId, runConfig }: StartRunConfig,
    runCallback?: ChatModelAdapter["run"],
  ): Promise<void> {
    this.ensureInitialized();

    // add assistant message
    const id = generateId();
    const message: ThreadAssistantMessage = {
      id,
      role: "assistant",
      status: { type: "running" },
      content: [],
      metadata: {
        unstable_state: this.state,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
      createdAt: new Date(),
    };

    return this._runLoop(parentId, message, runConfig, runCallback);
  }

  private async _runLoop(
    parentId: string | null,
    message: ThreadAssistantMessage,
    runConfig: RunConfig | undefined,
    runCallback?: ChatModelAdapter["run"],
  ): Promise<void> {
    this._notifyEventSubscribers("runStart", {});

    // A run entered on a requires-action message resumes a pause an
    // update-capable adapter already holds (written at pause time or loaded).
    const alreadyPersisted =
      message.status?.type === "requires-action" &&
      this._options.adapters.history?.update !== undefined;

    const run = { cancelled: false };
    this._activeRun = run;
    this._runGeneration++;

    let active = false;
    try {
      // mark busy for runs not started through the queue (regenerate, resume)
      this._queue?.notifyBusy();
      this._suggestions = [];
      this._suggestionsController?.abort();
      this._suggestionsController = null;
      this._notifySubscribers();

      do {
        message = await this.performRoundtrip(
          parentId,
          message,
          runConfig,
          alreadyPersisted,
          runCallback,
        );
        runCallback = undefined;
      } while (shouldContinue(message, this._options.unstable_humanToolNames));
    } finally {
      this._notifyEventSubscribers("runEnd", {});
      // the settle belongs to this run only while it is still the active run
      // or was cancelled (the engine expects a cancelled run's settle); a run
      // superseded by a newer one stays silent
      active = this._activeRun === run;
      if (active) this._activeRun = null;
      if (active || run.cancelled) {
        queueMicrotask(() => this._queue?.notifyIdle());
      }
    }

    if (
      active &&
      this.adapters.suggestion &&
      message.status?.type !== "requires-action"
    ) {
      this._suggestionsController = new AbortController();
      const signal = this._suggestionsController.signal;
      const adapter = this.adapters.suggestion;
      void (async () => {
        try {
          const promiseOrGenerator = adapter.generate({
            messages: this.messages,
            signal,
          });
          await consumeSuggestionResult(promiseOrGenerator, {
            signal,
            onUpdate: (r) => {
              this._suggestions = r;
              this._notifySubscribers();
            },
          });
        } catch {}
      })();
    }
  }

  private async performRoundtrip(
    parentId: string | null,
    message: ThreadAssistantMessage,
    runConfig: RunConfig | undefined,
    alreadyPersisted: boolean,
    runCallback?: ChatModelAdapter["run"],
  ) {
    const messages = parentId ? this.repository.getMessages(parentId) : [];

    // abort existing run
    this.abortController?.abort();
    const abortController = new AbortController();
    this.abortController = abortController;

    const initialContent = message.content;
    const initialAnnotations = message.metadata?.unstable_annotations;
    const initialData = message.metadata?.unstable_data;
    const initialSteps = message.metadata?.steps;
    const initialCustom = message.metadata?.custom;
    const updateMessage = (m: Partial<ChatModelRunResult>) => {
      const newSteps = m.metadata?.steps;
      const steps = newSteps
        ? [...(initialSteps ?? []), ...newSteps]
        : undefined;

      const newAnnotations = m.metadata?.unstable_annotations;
      const newData = m.metadata?.unstable_data;
      const annotations = newAnnotations
        ? [...(initialAnnotations ?? []), ...newAnnotations]
        : undefined;
      const data = newData ? [...(initialData ?? []), ...newData] : undefined;

      message = {
        ...message,
        ...(m.content
          ? { content: [...initialContent, ...(m.content ?? [])] }
          : undefined),
        status: m.status ?? message.status,
        ...(m.metadata
          ? {
              metadata: {
                ...message.metadata,
                ...(m.metadata.unstable_state !== undefined
                  ? { unstable_state: m.metadata.unstable_state }
                  : undefined),
                ...(annotations
                  ? { unstable_annotations: annotations }
                  : undefined),
                ...(data ? { unstable_data: data } : undefined),
                ...(steps ? { steps } : undefined),
                ...(m.metadata?.timing
                  ? { timing: m.metadata.timing }
                  : undefined),
                ...(m.metadata?.custom
                  ? {
                      custom: {
                        ...(initialCustom ?? {}),
                        ...m.metadata.custom,
                      },
                    }
                  : undefined),
              },
            }
          : undefined),
      };
      this.repository.addOrUpdateMessage(parentId, message);
      this._notifySubscribers();
    };

    const maxSteps = this._options.maxSteps ?? 2;

    try {
      const steps = message.metadata?.steps?.length ?? 0;
      if (steps >= maxSteps) {
        updateMessage({
          status: {
            type: "incomplete",
            reason: "tool-calls",
          },
        });
        return message;
      }

      updateMessage({
        status: {
          type: "running",
        },
      });

      // Switch to the new message branch right after adding it for the first time
      this.repository.resetHead(message.id);
      this._notifySubscribers();

      this._lastRunConfig = runConfig ?? {};
      // unstable_composerMetadata is composer-only (stamped onto the outgoing
      // message); never expose it to the chat-model adapter's run context.
      const { unstable_composerMetadata: _, ...context } =
        this.getModelContext();

      runCallback =
        runCallback ??
        this.adapters.chatModel.run.bind(this.adapters.chatModel);

      const abortSignal = abortController.signal;
      const threadId = this._getThreadId?.();
      const promiseOrGenerator = runCallback({
        messages,
        runConfig: this._lastRunConfig,
        abortSignal,
        context,
        unstable_assistantMessageId: message.id,
        unstable_threadId: threadId,
        unstable_parentId: parentId,
        unstable_getMessage() {
          return message;
        },
      });

      // handle async iterator for streaming results
      if (Symbol.asyncIterator in promiseOrGenerator) {
        for await (const r of promiseOrGenerator) {
          if (abortSignal.aborted) {
            updateMessage({
              status: { type: "incomplete", reason: "cancelled" },
            });
            break;
          }

          updateMessage(r);
        }
      } else {
        updateMessage(await promiseOrGenerator);
      }

      if (message.status.type === "running") {
        updateMessage({
          status: abortSignal.aborted
            ? { type: "incomplete", reason: "cancelled" }
            : { type: "complete", reason: "unknown" },
        });
      }
    } catch (e) {
      if (e instanceof AbortError) {
        updateMessage({
          status: { type: "incomplete", reason: "cancelled" },
        });
      } else if (e instanceof Error && e.name === "AbortError") {
        updateMessage({
          status: { type: "incomplete", reason: "cancelled" },
        });
      } else {
        updateMessage({
          status: {
            type: "incomplete",
            reason: "error",
            error: toAssistantError(e),
          },
        });

        throw e;
      }
    } finally {
      if (this.abortController === abortController) {
        this.abortController = null;
      }

      const history = this._options.adapters.history;
      const item = {
        parentId,
        message,
        runConfig: this._lastRunConfig,
      };
      const isTerminal =
        message.status.type === "complete" ||
        message.status.type === "incomplete";
      const isPausing =
        message.status.type === "requires-action" &&
        !shouldContinue(message, this._options.unstable_humanToolNames);

      // Pauses are written only for adapters that can rewrite the entry later;
      // an append-only adapter would strand a half-finished run in history.
      if (isTerminal || (isPausing && history?.update)) {
        const write =
          alreadyPersisted && history?.update
            ? history.update.bind(history)
            : history?.append.bind(history);
        if (write) {
          await this._chainHistoryWrite(message.id, () => write(item));
        }
      }
    }
    return message;
  }

  public detach() {
    invalidateThreadRuntime(this);
    // drop the queue so pending items cannot dispatch on a detached thread
    this._queue = null;
    this._releasePendingAttachmentSend();
    const error = new AbortError(true);
    this.abortController?.abort(error);
    this.abortController = null;
    this._suggestionsController?.abort();
    this._suggestionsController = null;
  }

  public cancelRun() {
    if (this._queue) {
      if (this._options.unstable_queueClearOnCancel ?? true) {
        this._queue.clear();
      } else {
        this._queue.notifyCancelled();
        if (this._activeRun) this._activeRun.cancelled = true;
      }
    }
    // The thread's counterpart to the composer reset that releases a stalled
    // send lock: a hung upload must not hold every later append forever.
    this._releasePendingAttachmentSend();
    const error = new AbortError(false);
    this.abortController?.abort(error);
    this.abortController = null;
    this._suggestionsController?.abort();
    this._suggestionsController = null;
  }

  public addToolResult({
    messageId,
    toolCallId,
    result,
    isError,
    artifact,
  }: AddToolResultOptions) {
    const messageData = this.repository.getMessage(messageId);
    const { parentId } = messageData;
    let { message } = messageData;

    if (message.role !== "assistant")
      throw new Error("Tried to add tool result to non-assistant message");

    let added = false;
    let found = false;
    const newContent = message.content.map((c) => {
      if (c.type !== "tool-call") return c;
      if (c.toolCallId !== toolCallId) return c;
      found = true;
      if (c.result === undefined) added = true;
      return {
        ...c,
        result,
        artifact,
        isError,
      };
    });

    if (!found)
      throw new Error("Tried to add tool result to non-existing tool call");

    message = {
      ...message,
      content: newContent,
    };
    this.repository.addOrUpdateMessage(parentId, message);
    this._notifySubscribers();

    // a result may arrive mid-run or on a non-head message; the resume
    // intentionally aborts any in-flight run, unlike respondToToolApproval
    if (
      added &&
      shouldContinue(message, this._options.unstable_humanToolNames)
    ) {
      this._runLoop(parentId, message, this._lastRunConfig).catch(() => {});
    } else if (added) {
      this._persistPausedMessage(parentId, message);
    }
  }

  public resumeToolCall(_options: ResumeToolCallOptions) {
    throw new Error(
      "Local runtime does not support resuming tool calls. For human-in-the-loop tools, list the tool in unstable_humanToolNames and complete the call with addToolResult.",
    );
  }

  public respondToToolApproval({
    approvalId,
    approved,
    optionId,
    reason,
  }: RespondToToolApprovalOptions) {
    let message = this.repository
      .getMessages()
      .findLast(
        (m): m is ThreadAssistantMessage =>
          m.role === "assistant" &&
          m.content.some(
            (c) => c.type === "tool-call" && c.approval?.id === approvalId,
          ),
      );

    if (!message)
      throw new Error("Tried to respond to a non-existing tool approval");

    if (this.abortController !== null)
      throw new Error(
        "Tried to respond to a tool approval while a run is in progress",
      );

    if (message.status?.type !== "requires-action")
      throw new Error(
        "Tried to respond to a tool approval on a message whose status is not requires-action",
      );

    const target = message.content.find(
      (c) => c.type === "tool-call" && c.approval?.id === approvalId,
    );
    if (target?.type !== "tool-call" || !target.approval)
      throw new Error("Tried to respond to a non-existing tool approval");
    if (target.approval.resolution !== undefined)
      throw new Error(
        "Tried to respond to a tool approval that was cancelled or expired",
      );
    if (target.approval.approved !== undefined)
      throw new Error("Tried to respond to an already decided tool approval");

    const targetApproval = target.approval;
    const newContent = message.content.map((c) => {
      if (c !== target) return c;
      const approval = {
        ...targetApproval,
        approved,
        ...(optionId != null && { optionId }),
        ...(reason != null && { reason }),
      };
      if (approved) return { ...c, approval };
      return {
        ...c,
        approval,
        result: { error: reason || "Tool approval denied" },
        isError: true,
      };
    });

    message = { ...message, content: newContent };
    const { parentId } = this.repository.getMessage(message.id);
    this.repository.addOrUpdateMessage(parentId, message);
    this._notifySubscribers();

    if (
      this.repository.headId === message.id &&
      shouldContinue(message, this._options.unstable_humanToolNames)
    ) {
      this._runLoop(parentId, message, this._lastRunConfig).catch(() => {});
    } else {
      this._persistPausedMessage(parentId, message);
    }
  }
}

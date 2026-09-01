import { shallowEqual } from "@assistant-ui/store/client";
import type { AppendMessage, ThreadMessage } from "../../types/message";
import type { Attachment } from "../../types/attachment";
import type {
  AddToolResultOptions,
  ResumeRunConfig,
  ResumeToolCallOptions,
  RespondToToolApprovalOptions,
  StartRunConfig,
  ThreadSuggestion,
} from "../../runtime/interfaces/thread-runtime-core";

import type {
  ExternalStoreAdapter,
  ExternalStoreBranchChange,
} from "./external-store-adapter";
import {
  getExternalStoreMessages,
  bindExternalStoreMessage,
  FALLBACK_ID_PREFIX,
} from "../../runtime/utils/external-store-message";
import { ThreadMessageConverter } from "./thread-message-converter";
import {
  getContentAutoStatus,
  isAutoStatus,
} from "../../runtime/utils/auto-status";
import {
  fromThreadMessageLike,
  type ThreadMessageLike,
} from "../../runtime/utils/thread-message-like";
import { getThreadMessageText } from "../../utils/text";
import { shallowArrayEqual } from "../../runtime/utils/external-message-conversion";
import type {
  RuntimeCapabilities,
  ThreadRuntimeCore,
} from "../../runtime/interfaces/thread-runtime-core";
import type {
  ExternalThreadQueueAdapter,
  QueuePlacement,
} from "../../runtime/queue/external-thread-queue-adapter";
import { BaseThreadRuntimeCore } from "../../runtime/base/base-thread-runtime-core";
import type { ModelContextProvider } from "../../model-context/types";
import {
  ExportedMessageRepository,
  MessageRepository,
} from "../../runtime/utils/message-repository";
import { generateId } from "../../utils/id";
import {
  ToolInvocationTracker,
  type ToolExecutionStatus,
} from "../tool-invocations/ToolInvocationTracker";
import { EMPTY_QUEUE_ITEMS } from "../../runtime/queue/queue-item";
import type { QuoteInfo } from "../../types/quote";
import {
  captureThreadRuntimeGeneration,
  isThreadRuntimeGenerationCurrent,
} from "../../runtime/utils/thread-runtime-lifecycle";

const EMPTY_ARRAY: readonly ThreadSuggestion[] = Object.freeze([]);

const observeAdapterCallback = (
  name: "onAddToolResult" | "onRespondToToolApproval" | "onCancel",
  result: Promise<void> | void,
) => {
  void Promise.resolve(result).catch((error) => {
    console.error(
      `[ExternalStoreThreadRuntimeCore] ${name} callback rejected`,
      error,
    );
  });
};

export const hasUpcomingMessage = (
  isRunning: boolean,
  messages: readonly ThreadMessage[],
) => {
  return isRunning && messages[messages.length - 1]?.role !== "assistant";
};

export class ExternalStoreThreadRuntimeCore
  extends BaseThreadRuntimeCore
  implements ThreadRuntimeCore
{
  private _capabilities: RuntimeCapabilities = {
    switchToBranch: false,
    switchBranchDuringRun: false,
    edit: false,
    delete: false,
    reload: false,
    refetchThread: false,
    cancel: false,
    unstable_copy: false,
    speech: false,
    dictation: false,
    voice: false,
    attachments: false,
    feedback: false,
    queue: false,
  };

  public get capabilities() {
    return this._capabilities;
  }

  private _messages!: readonly ThreadMessage[];
  public isDisabled!: boolean;
  public isSendDisabled!: boolean;
  public get isLoading() {
    return this._store.isLoading ?? false;
  }
  // Unlike `isLoading`: pass `undefined` through to preserve the `getThreadState` fallback.
  public get isRunning(): boolean | undefined {
    if (this._hasExecutingTools(this._store)) return true;
    return this._store.isRunning;
  }

  protected override _getBaseMessages(): readonly ThreadMessage[] {
    return this._messages;
  }

  public override get state() {
    return this._store.state ?? super.state;
  }

  public get adapters() {
    return this._store.adapters;
  }

  // A getter, not a method, so its presence tracks the adapter.
  public get unstable_refetchThread(): (() => Promise<void>) | undefined {
    if (!this._store.onRefetchThread) return undefined;
    return () => this._store.onRefetchThread!();
  }

  public suggestions: readonly ThreadSuggestion[] = [];
  public extras: unknown = undefined;

  private _converter = new ThreadMessageConverter();

  // Ids the host was asked to delete via onDelete. The snapshot pass evicts
  // them from the repository once the host's array no longer carries them;
  // an id the host kept is dropped from the set without eviction.
  // Branch-changing mutations (edit, branch switch, reload) invalidate the
  // set, because after them the incoming array omits off-branch ids for
  // reasons unrelated to deletion. Plain tail sends do not clear: a tail
  // append cannot make a visible id absent, so id-absence stays unambiguous
  // and a delete whose confirmation races a send keeps its eviction.
  private _pendingDeleteEvictions = new Set<string>();

  // Placeholder id for the upcoming assistant message, reused across snapshot
  // passes while the same tail message awaits its response so the placeholder
  // keeps one identity per response.
  private _optimistic: { id: string; parentId: string | null } | null = null;

  private _store!: ExternalStoreAdapter<any>;

  private _getInitializePromise?: () => Promise<unknown> | undefined;

  public __internal_setGetInitializePromise(
    getPromise: () => Promise<unknown> | undefined,
  ) {
    this._getInitializePromise = getPromise;
  }

  private _transformedQueue: ExternalThreadQueueAdapter | undefined;

  /**
   * Client-side tool-invocations pipeline. Constructed lazily on first
   * snapshot — only when `adapter.unstable_enableToolInvocations === true`.
   */
  private _toolInvocations: ToolInvocationTracker | null = null;
  private _toolStatuses: ReadonlyMap<string, ToolExecutionStatus> = new Map();
  private _effectiveIsRunning = false;
  private _inTrackerUpdate = false;
  private _pendingRunningRefresh = false;

  /**
   * Tracker mutations initiated by this class (setState, reset) can publish
   * status changes synchronously. Re-entering the snapshot pipeline from
   * inside them would feed the tracker a stale snapshot and consume the
   * restore arming a reset just installed, so the running refresh is
   * deferred until the mutation returns and stays off the tracker.
   */
  private _runTrackerUpdate(fn: () => void): void {
    this._inTrackerUpdate = true;
    try {
      fn();
    } finally {
      this._inTrackerUpdate = false;
    }
    if (this._pendingRunningRefresh) {
      this._pendingRunningRefresh = false;
      this._refreshEffectiveIsRunning();
    }
  }

  private _refreshEffectiveIsRunning(): void {
    const isRunning = this._getEffectiveIsRunning(this._store);
    if (this._effectiveIsRunning === isRunning) return;
    this._effectiveIsRunning = isRunning;
    this._notifyEventSubscribers(isRunning ? "runStart" : "runEnd", {});
    this._notifySubscribers();
  }

  private _hasExecutingTools(store: ExternalStoreAdapter<any>): boolean {
    if (store.unstable_enableToolInvocations !== true) return false;
    if (this._toolInvocations === null) return false;
    for (const status of this._toolStatuses.values()) {
      if (status.type === "executing") return true;
    }
    return false;
  }

  private _getEffectiveIsRunning(store: ExternalStoreAdapter<any>): boolean {
    return (store.isRunning ?? false) || this._hasExecutingTools(store);
  }

  public override beginEdit(messageId: string) {
    if (!this._store.onEdit)
      throw new Error("Runtime does not support editing.");

    super.beginEdit(messageId);
  }

  constructor(
    contextProvider: ModelContextProvider,
    store: ExternalStoreAdapter<any>,
  ) {
    super(contextProvider);
    this.__internal_setAdapter(store);
  }

  public __internal_setAdapter(store: ExternalStoreAdapter<any>) {
    if (this._store === store) return;

    this._updateStoreSnapshot(store);
  }

  private _updateStoreSnapshot(store: ExternalStoreAdapter<any>) {
    const previousIsRunning = this._effectiveIsRunning;
    this.isDisabled = store.isDisabled ?? false;
    this.isSendDisabled = store.isSendDisabled ?? false;

    const oldStore = this._store as ExternalStoreAdapter<any> | undefined;
    this._store = store;
    const isRunning = this._getEffectiveIsRunning(store);
    const repositoryInstance = store.unstable_messageRepositoryInstance;
    const repositoryChanged =
      repositoryInstance !== undefined &&
      repositoryInstance !== this.repository;
    if (repositoryChanged) {
      this.repository = repositoryInstance;
      this._pendingDeleteEvictions.clear();
    }
    if (oldStore?.queue !== store.queue) {
      this._transformedQueue = undefined;
      store.queue?.__internal_setDispatchTransform?.((message) => {
        // Re-point at the tail, as LocalThreadRuntimeCore's driver does, so
        // the prefix gated against is the one the message lands on whatever
        // the host routes by. Queuing only ever accepts a tail append, so a
        // later tail is the same intent.
        const parentId = this.messages.at(-1)?.id ?? null;
        return this.enrichAppendMetadata({ ...message, parentId }, parentId);
      });
      if (store.queue?.__internal_setDispatchTransform)
        this._transformedQueue = store.queue;
    }
    if (this.extras !== store.extras) {
      this.extras = store.extras;
    }

    const newSuggestions = store.suggestions ?? EMPTY_ARRAY;
    if (!shallowEqual(this.suggestions, newSuggestions)) {
      this.suggestions = newSuggestions;
    }

    const newCapabilities: RuntimeCapabilities = {
      switchToBranch: this._store.setMessages !== undefined,
      switchBranchDuringRun: false,
      edit: this._store.onEdit !== undefined,
      delete:
        this._store.onDelete !== undefined ||
        this._store.setMessages !== undefined,
      reload: this._store.onReload !== undefined,
      refetchThread: this._store.onRefetchThread !== undefined,
      cancel: this._store.onCancel !== undefined,
      speech: this._store.adapters?.speech !== undefined,
      dictation: this._store.adapters?.dictation !== undefined,
      voice: this._store.adapters?.voice !== undefined,
      unstable_copy: this._store.unstable_capabilities?.copy !== false,
      attachments: !!this._store.adapters?.attachments,
      feedback: !!this._store.adapters?.feedback,
      queue: this._store.queue !== undefined,
    };
    if (!shallowEqual(this._capabilities, newCapabilities)) {
      this._capabilities = newCapabilities;
    }

    let messages: readonly ThreadMessage[];

    if (store.messageRepository) {
      // Handle messageRepository
      if (
        oldStore &&
        !repositoryChanged &&
        oldStore.isRunning === store.isRunning &&
        oldStore.messageRepository === store.messageRepository &&
        previousIsRunning === isRunning
      ) {
        this._notifySubscribers();
        return;
      }

      const incoming = store.messageRepository.messages;
      const headId =
        store.messageRepository.headId ?? incoming.at(-1)?.message.id ?? null;

      if (
        oldStore &&
        !repositoryChanged &&
        oldStore.messageRepository === store.messageRepository
      ) {
        this.repository.resetHead(headId);
        messages = this.repository.getMessages();
      } else {
        const incomingIds = new Set(incoming.map(({ message }) => message.id));
        for (const { message, parentId } of incoming) {
          this.repository.addOrUpdateMessage(parentId, message);
        }
        for (const { message } of this.repository.export().messages) {
          if (!incomingIds.has(message.id)) {
            this.repository.deleteMessage(message.id);
          }
        }
        this._pendingDeleteEvictions.clear();
        this.repository.resetHead(headId);
        messages = this.repository.getMessages();
      }
    } else if (store.messages) {
      // Handle messages array

      if (oldStore) {
        // flush the converter cache when the convertMessage prop changes
        if (oldStore.convertMessage !== store.convertMessage) {
          this._converter = new ThreadMessageConverter();
        } else if (
          !repositoryChanged &&
          oldStore.isRunning === store.isRunning &&
          oldStore.messages === store.messages &&
          previousIsRunning === isRunning
        ) {
          this._notifySubscribers();
          // no conversion update
          return;
        }
      }

      messages = !store.convertMessage
        ? store.messages
        : this._converter.convertMessages(store.messages, (cache, m, idx) => {
            if (!store.convertMessage) return m;

            const isLast = idx === (store.messages?.length ?? 0) - 1;
            const fallbackId = `${FALLBACK_ID_PREFIX}${idx}`;

            if (
              cache &&
              (cache.role !== "assistant" ||
                !isAutoStatus(cache.status) ||
                cache.status ===
                  getContentAutoStatus(cache.content, isLast, isRunning))
            ) {
              if (
                cache.id.startsWith(FALLBACK_ID_PREFIX) &&
                cache.id !== fallbackId
              ) {
                const updated = { ...cache, id: fallbackId };
                bindExternalStoreMessage(updated, m);
                return updated;
              }
              return cache;
            }

            const messageLike = store.convertMessage(m, idx);
            const newMessage = fromThreadMessageLike(
              messageLike,
              fallbackId,
              getContentAutoStatus(messageLike.content, isLast, isRunning),
            );
            bindExternalStoreMessage(newMessage, m);
            return newMessage;
          });

      const seenIds = new Set<string>();
      const deduped: ThreadMessage[] = [];
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i]!;
        if (seenIds.has(message.id)) {
          console.warn(
            `ExternalStoreThreadRuntimeCore: duplicate message id "${message.id}" in the provided messages array; keeping the last occurrence.`,
          );
          continue;
        }
        seenIds.add(message.id);
        deduped.push(message);
      }
      if (deduped.length !== messages.length) messages = deduped.reverse();

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i]!;
        const parent = messages[i - 1];
        this.repository.addOrUpdateMessage(parent?.id ?? null, message);
      }

      if (this._pendingDeleteEvictions.size > 0) {
        const incomingIds = new Set(messages.map((m) => m.id));
        for (const id of this._pendingDeleteEvictions) {
          this._pendingDeleteEvictions.delete(id);
          if (incomingIds.has(id)) continue;
          try {
            this.repository.getMessage(id);
          } catch {
            continue;
          }
          this.repository.deleteMessage(id);
        }
      }
    } else {
      throw new Error(
        "ExternalStoreAdapter must provide either 'messages' or 'messageRepository'",
      );
    }

    // Common logic for both paths
    if (messages.length > 0) this.ensureInitialized();

    this._effectiveIsRunning = isRunning;
    if (previousIsRunning !== isRunning) {
      if (isRunning) {
        this._notifyEventSubscribers("runStart", {});
      } else {
        this._notifyEventSubscribers("runEnd", {});
      }
    }

    // Append an optimistic placeholder while running but before a trailing
    // assistant message exists. resetHead evicts off-branch optimistic messages
    // (prior placeholders, mid-run id-swap siblings); export() never persists them.
    let optimisticId: string | null = null;
    if (hasUpcomingMessage(isRunning, messages)) {
      const parentId = messages.at(-1)?.id ?? null;
      if (this._optimistic?.parentId !== parentId) {
        this._optimistic = { id: generateId(), parentId };
      }
      optimisticId = this._optimistic.id;
      this.repository.addOrUpdateMessage(
        parentId,
        fromThreadMessageLike(
          { role: "assistant", content: [], metadata: { isOptimistic: true } },
          optimisticId,
          { type: "running" },
        ),
      );
    }

    if (optimisticId === null) this._optimistic = null;
    this.repository.resetHead(optimisticId ?? messages.at(-1)?.id ?? null);

    const messagesSnapshot = this.repository.getMessages();
    if (
      !this._messages ||
      !shallowArrayEqual(this._messages, messagesSnapshot)
    ) {
      this._messages = messagesSnapshot;
    }

    if (repositoryChanged) {
      this._runTrackerUpdate(() => this._toolInvocations?.reset());
    }
    this._runTrackerUpdate(() => this._driveToolInvocations());

    this._notifySubscribers();
  }

  /**
   * Feed the current message snapshot into the tool-invocations tracker.
   * Opt-in via `adapter.unstable_enableToolInvocations: true`. The tracker
   * itself is fail-silent — see ToolInvocationTracker for the
   * state-transition contract.
   */
  private _driveToolInvocations(): void {
    if (!this._store.unstable_enableToolInvocations) {
      // Adapter did not opt in (default). If a tracker was previously
      // constructed (e.g. the adapter just toggled the flag off via a
      // dynamic swap), drop it so subsequent snapshots are no-ops.
      if (this._toolInvocations) {
        this._toolInvocations.reset();
        this._toolInvocations = null;
        this._toolStatuses = new Map();
        this._store.setToolStatuses?.({});
      }
      return;
    }

    if (!this._toolInvocations) {
      this._toolInvocations = new ToolInvocationTracker(
        () => this.getModelContext().tools,
        {
          onResult: (command) => {
            try {
              const messageId = this._findMessageIdForToolCall(
                command.toolCallId,
              );
              if (messageId === undefined) {
                // The tool call no longer exists in the snapshot (e.g.
                // rolled back). Drop the result.
                return;
              }
              observeAdapterCallback(
                "onAddToolResult",
                this._store.onAddToolResult?.({
                  messageId,
                  toolCallId: command.toolCallId,
                  toolName: command.toolName,
                  result: command.result,
                  isError: command.isError,
                  ...(command.artifact !== undefined && {
                    artifact: command.artifact,
                  }),
                  ...(command.modelContent !== undefined && {
                    modelContent: command.modelContent,
                  }),
                }),
              );
            } catch (err) {
              console.error(
                "[ExternalStoreThreadRuntimeCore] onAddToolResult dispatch failed",
                err,
              );
            }
          },
          onStatusesChange: (statuses) => {
            const hadExecutingTools = this._hasExecutingTools(this._store);
            this._toolStatuses = statuses;
            try {
              this._store.setToolStatuses?.(Object.fromEntries(statuses));
            } finally {
              if (hadExecutingTools !== this._hasExecutingTools(this._store)) {
                if (this._inTrackerUpdate) {
                  this._pendingRunningRefresh = true;
                } else {
                  this._updateStoreSnapshot(this._store);
                }
              }
            }
          },
        },
        (toolCall) => this._store.unstable_isClientToolCall?.(toolCall) ?? true,
      );
    }

    this._toolInvocations.setState({
      messages: this._messages,
      isRunning: this._getEffectiveIsRunning(this._store),
      ...(this._store.isLoading !== undefined && {
        isLoading: this._store.isLoading,
      }),
    });
  }

  /**
   * Lookup table from `toolCallId` to the owning assistant message's `id`,
   * rebuilt lazily when `_messages` changes (see `_messagesForToolCallIndex`).
   */
  private _toolCallToMessageId = new Map<string, string>();
  private _messagesForToolCallIndex: readonly ThreadMessage[] | null = null;

  /**
   * Look up the assistant message that owns a tool-call part. Lazily builds
   * (and caches) a `toolCallId → messageId` map keyed off the current
   * `_messages` reference, so onResult dispatches stay O(1) instead of
   * walking the full thread on every result.
   */
  private _findMessageIdForToolCall(toolCallId: string): string | undefined {
    if (this._messagesForToolCallIndex !== this._messages) {
      this._toolCallToMessageId.clear();
      const visit = (messages: readonly ThreadMessage[]): void => {
        for (const message of messages) {
          if (!Array.isArray(message.content)) continue;
          for (const part of message.content) {
            if (!part || part.type !== "tool-call") continue;
            this._toolCallToMessageId.set(part.toolCallId, message.id);
            if (part.messages) visit(part.messages);
          }
        }
      };
      visit(this._messages);
      this._messagesForToolCallIndex = this._messages;
    }
    return this._toolCallToMessageId.get(toolCallId);
  }

  public override switchToBranch(branchId: string): void {
    if (!this._store.setMessages)
      throw new Error("Runtime does not support switching branches.");

    // Silently ignore branch switches while running
    if (this._getEffectiveIsRunning(this._store)) {
      return;
    }

    const onBranchChange = this._store.unstable_onBranchChange;
    const previousHeadId = onBranchChange
      ? this.repository.canonicalHeadId
      : null;

    this.repository.switchToBranch(branchId);
    this._pendingDeleteEvictions.clear();
    this.updateMessages(this.repository.getMessages());
    if (onBranchChange) {
      this._notifyBranchChange(previousHeadId, onBranchChange);
    }
  }

  /**
   * Emit `unstable_onBranchChange` for an explicit branch switch. Reads the
   * canonical head from the repository (which skips optimistic/transient
   * messages) and de-dupes switches that leave the canonical head unchanged.
   * Comparing against the head observed just before the switch — rather than the
   * last emitted head — keeps a switch firing after an adapter resync moved the
   * head elsewhere in the meantime.
   */
  private _notifyBranchChange(
    previousHeadId: string | null,
    onBranchChange: (event: ExternalStoreBranchChange) => void,
  ): void {
    const headId = this.repository.canonicalHeadId;
    if (headId === previousHeadId) return;

    onBranchChange({
      headId,
      visibleMessageIds: this.repository.getMessages().map((m) => m.id),
    });
  }

  public async append(rawMessage: AppendMessage): Promise<void> {
    // sourceId marks an edit send; the parent may coincide with the head
    // after a resync (e.g. cancelRun dropped the edited message).
    const isEdit =
      rawMessage.sourceId != null ||
      rawMessage.parentId !== (this.messages.at(-1)?.id ?? null);

    // A transformed-queue send is stamped at flush; any other queue's
    // transform would gate against its own thread's messages, so those stamp
    // at send.
    const message =
      !isEdit &&
      this._store.queue &&
      this._store.queue === this._transformedQueue
        ? rawMessage
        : this.enrichAppendMetadata(rawMessage);

    const generation = captureThreadRuntimeGeneration(this);
    this.ensureInitialized();

    // The getter call is what starts thread initialization.
    const initPromise = this._getInitializePromise?.();

    // The queue driver dispatches through the host adapter, outside this
    // core, so the initialization barrier must run before a message can
    // enter the queue.
    if (!isEdit && this._store.queue) {
      if (initPromise) {
        await initPromise;
      }
      if (!isThreadRuntimeGenerationCurrent(this, generation)) return;

      // Buffering does not start a run, so the tool-abort below must wait
      // until the queue flushes. By then the prior run (and its tools) has
      // settled.
      if (message.steer ?? this._getEffectiveIsRunning(this._store))
        this._store.queue.steer(message);
      else this._store.queue.enqueue(message);
      return;
    }

    // The optimistic insert lives inside the adapter's dispatch, so holding
    // `onNew` on initialization would keep the message off screen for the
    // whole roundtrip. Seams that need the remote identity await
    // `threadListItem.initialize()` themselves, and a rejection surfaces
    // there.
    void initPromise?.catch(() => {});

    // Auto-abort in-flight client-side tool executions when a new run is
    // about to start. Without this, a tool that finishes after the new turn
    // begins would feed a stale result into `onAddToolResult`, racing with
    // the new turn the user just initiated. `startRun` defaults to true for
    // user messages — matches the satellites' historical opt-in cancel
    // behavior, which is now built in.
    if (message.startRun ?? message.role === "user") {
      await this._toolInvocations?.abort();
    }
    if (!isThreadRuntimeGenerationCurrent(this, generation)) return;

    if (isEdit) {
      if (!this._store.onEdit)
        throw new Error("Runtime does not support editing messages.");
      this._pendingDeleteEvictions.clear();
      await this._store.onEdit(message);
    } else {
      await this._store.onNew(message);
    }
  }

  public async deleteMessage(messageId: string): Promise<void> {
    if (this._store.onDelete) {
      // The host owns deletion here, and it may decline (fail a server call,
      // cancel a confirm dialog, ignore an off-branch id). The eviction is
      // therefore deferred to the snapshot pass, which evicts only once the
      // host's own array no longer carries the id. Registered before the
      // callback because an optimistic host publishes that snapshot while
      // the callback is still awaited.
      const wasVisible = this.repository
        .getMessages()
        .some((m) => m.id === messageId);
      if (wasVisible) this._pendingDeleteEvictions.add(messageId);
      try {
        await this._store.onDelete(messageId);
      } catch (error) {
        this._pendingDeleteEvictions.delete(messageId);
        throw error;
      }
      return;
    }

    if (!this._store.setMessages)
      throw new Error("Runtime does not support deleting messages.");

    if (this._getEffectiveIsRunning(this._store)) {
      await this._toolInvocations?.abort();
    }

    const messages = this.repository.getMessages();
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) throw new Error("Message not found.");

    this._pendingDeleteEvictions.clear();
    this.updateMessages(messages.filter((message) => message.id !== messageId));
    this._evictDeletedMessage(messageId);
  }

  // The snapshot pass only relinks incoming messages; it never evicts, so
  // without this the deleted message survives as a sibling branch that the
  // branch picker can resurrect into the host store. `_messages` is refreshed
  // before notifying so `messages` and the branch graph agree at notify time,
  // mirroring the end of the snapshot pass.
  private _evictDeletedMessage(messageId: string) {
    // Positional fallback ids are remapped in the snapshot pass; evicting
    // them first leaves the pre-renumber node as a sibling of the new head.
    if (messageId.startsWith(FALLBACK_ID_PREFIX)) return;
    // A synchronous host update (e.g. a setMessages that re-entered the
    // snapshot pass) may have evicted the message already; only that case is
    // skipped, so genuine repository errors still propagate.
    try {
      this.repository.getMessage(messageId);
    } catch {
      return;
    }

    this.repository.deleteMessage(messageId);
    this._messages = this.repository.getMessages();
    this._notifySubscribers();
  }

  public getQueueItems() {
    // The composer reads this during base-thread construction, before the
    // constructor assigns `_store`, so guard against the unset field.
    return this._store?.queue?.items ?? EMPTY_QUEUE_ITEMS;
  }

  public getSteerQueueItems() {
    return this._store?.queue?.steerItems ?? EMPTY_QUEUE_ITEMS;
  }

  public moveQueueItem(queueItemId: string, placement: QueuePlacement) {
    this._store?.queue?.move(queueItemId, placement);
  }

  public removeQueueItem(queueItemId: string) {
    this._store?.queue?.remove(queueItemId);
  }

  public async startRun(config: StartRunConfig): Promise<void> {
    if (!this._store.onReload)
      throw new Error("Runtime does not support reloading messages.");

    this._pendingDeleteEvictions.clear();

    // Auto-abort in-flight client-side tool executions when a run reloads;
    // any results that land afterward would target a turn that no longer
    // exists. See `append` above for full rationale.
    await this._toolInvocations?.abort();

    await this._store.onReload(config.parentId, config);
  }

  public async resumeRun(config: ResumeRunConfig): Promise<void> {
    if (!this._store.onResume)
      throw new Error("Runtime does not support resuming runs.");

    await this._store.onResume(config);
  }

  public exportExternalState(): any {
    if (!this._store.onExportExternalState)
      throw new Error("Runtime does not support exporting external states.");

    return this._store.onExportExternalState();
  }

  public importExternalState(state: any): void {
    if (!this._store.onLoadExternalState)
      throw new Error("Runtime does not support importing external states.");

    // Re-arm the tracker so the next adapter snapshot (containing the
    // imported state) is treated as historical — no streamCall/execute
    // fires for the loaded tool calls. The adapter is expected to update
    // its messages in response to onLoadExternalState; that update flows
    // back here via __internal_setAdapter. The tracker publishes the
    // cleared status map itself, so adapter-side statuses reset only when
    // the tracker is the source of truth.
    this._runTrackerUpdate(() => this._toolInvocations?.reset());

    this._store.onLoadExternalState(state);
  }

  /**
   * Adapter-facing notification that the backing session was discarded.
   * Clears session-scoped tool-invocation state and parks queued work,
   * without run-cancel semantics (`onCancel`, composer draft restoration).
   */
  public unstable_notifySessionReset(): void {
    this._runTrackerUpdate(() => this._toolInvocations?.reset());
    this._store.queue?.__internal_notifyCancelled?.();
  }

  public cancelRun(): void {
    if (!this._store.onCancel)
      throw new Error("Runtime does not support cancelling runs.");

    const generation = captureThreadRuntimeGeneration(this);

    // Abort any in-flight client-side tool executions. Fire-and-forget —
    // the abort resolves once executions settle, but we don't gate the
    // cancel on it.
    void this._toolInvocations?.abort();

    // Before the run is aborted, so the settle it produces keeps the pending
    // items instead of dispatching the next one at the moment the user
    // stopped.
    this._store.queue?.__internal_notifyCancelled?.();

    observeAdapterCallback("onCancel", this._store.onCancel());

    this.dropEmptyOptimisticHead();

    const messages = this.repository.getMessages();
    const previousMessage = messages[messages.length - 1];
    const trailingUserLeaf =
      this._store.setMessages !== undefined &&
      previousMessage?.role === "user" &&
      previousMessage.id === messages.at(-1)?.id && // ensure the previous message is a leaf node
      previousMessage.content.every((part) => part.type === "text")
        ? previousMessage
        : undefined;

    // Handing the message to the composer and taking it out of the thread are
    // one move: the composer refuses while the user is writing, and removing
    // the message then would leave it nowhere. A message the composer cannot
    // hold whole, carrying content parts it has no home for, is not moved.
    let movedLeaf:
      | {
          id: string;
          draft: {
            text: string;
            attachments: readonly Attachment[];
            quote: QuoteInfo | undefined;
          };
        }
      | undefined;
    if (trailingUserLeaf) {
      const draft = {
        text: getThreadMessageText(trailingUserLeaf),
        attachments: trailingUserLeaf.attachments,
        quote: trailingUserLeaf.metadata.custom.quote as QuoteInfo | undefined,
      };
      if (this.composer.restoreDraft(draft)) {
        this.repository.deleteMessage(trailingUserLeaf.id);
        movedLeaf = { id: trailingUserLeaf.id, draft };
      }
    }
    if (!movedLeaf) this._notifySubscribers();

    // The resync commits what the cancel left (a kept optimistic message, the
    // restored branch) back to the store a macrotask later. The store may move
    // in that gap; a server settling the cancelled turn lands in the same
    // tick. Read the repository at flush time and re-apply the rollbacks to
    // it, instead of stamping a snapshot captured above over the newer state.
    setTimeout(() => {
      if (!isThreadRuntimeGenerationCurrent(this, generation)) return;

      this.dropEmptyOptimisticHead();
      if (movedLeaf) {
        const current = this.repository.getMessages();
        if (current.at(-1)?.id === movedLeaf.id) {
          // Unanswered tail: the removal has not reached the store yet.
          this.repository.deleteMessage(movedLeaf.id);
        } else if (current.some((m) => m.id === movedLeaf.id)) {
          // The store kept the turn in the thread; take the untouched draft
          // back so the same content does not sit in both places.
          this.composer.retractDraft(movedLeaf.draft);
        }
      }
      this.updateMessages(this.repository.getMessages());
    }, 0);
  }

  // Placeholder or pre-stream message; a partially-streamed one is kept and
  // committed to the store by the cancel resync.
  private dropEmptyOptimisticHead(): void {
    const head = this.repository.getMessages().at(-1);
    if (head && head.metadata.isOptimistic && head.content.length === 0) {
      this.repository.deleteMessage(head.id);
    }
  }

  public addToolResult(options: AddToolResultOptions) {
    if (!this._store.onAddToolResult)
      throw new Error("Runtime does not support tool results.");
    observeAdapterCallback(
      "onAddToolResult",
      this._store.onAddToolResult(options),
    );
  }

  public resumeToolCall(options: ResumeToolCallOptions) {
    // Tracker owns its own human-input handlers — let it resume in-process
    // tool calls without round-tripping through the adapter. Falls back to
    // the adapter's onResumeToolCall (if any) for tool calls the tracker
    // doesn't know about.
    const handled =
      this._toolInvocations?.resume(options.toolCallId, options.payload) ??
      false;
    if (handled) return;

    if (this._store.onResumeToolCall) {
      this._store.onResumeToolCall(options);
      return;
    }

    throw new Error(
      `Tool call ${options.toolCallId} is not waiting for resume.`,
    );
  }

  public respondToToolApproval(options: RespondToToolApprovalOptions) {
    if (!this._store.onRespondToToolApproval)
      throw new Error("Runtime does not support tool approvals.");
    observeAdapterCallback(
      "onRespondToToolApproval",
      this._store.onRespondToToolApproval(options),
    );
  }

  public override reset(initialMessages?: readonly ThreadMessageLike[]) {
    const repo = new MessageRepository();
    repo.import(ExportedMessageRepository.fromArray(initialMessages ?? []));
    this.updateMessages(repo.getMessages());
  }

  public override import(data: ExportedMessageRepository) {
    super.import(data);

    if (this._store.onImport) {
      this._store.onImport(this.repository.getMessages());
    }
  }

  private updateMessages = (messages: readonly ThreadMessage[]) => {
    const hasConverter = this._store.convertMessage !== undefined;
    if (hasConverter) {
      this._store.setMessages?.(messages.flatMap(getExternalStoreMessages));
    } else {
      // TODO mark this as readonly in v0.12.0
      this._store.setMessages?.(messages as ThreadMessage[]);
    }
  };
}

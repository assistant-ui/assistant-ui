import { shallowEqual } from "@assistant-ui/store/client";
import type {
  AppendMessage,
  ThreadAssistantMessage,
  ThreadMessage,
} from "../../types/message";
import type { Attachment } from "../../types/attachment";
import type {
  AddToolResultOptions,
  ResumeRunConfig,
  ResumeToolCallOptions,
  RespondToToolApprovalOptions,
  StartRunConfig,
  ThreadSuggestion,
  Unstable_RecordToolInteractionOptions,
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
import { walkToolCallTree } from "../../runtime/utils/tool-call-tree";
import {
  NO_TOOL_EXECUTIONS,
  ToolInvocationTracker,
  type AddToolResultCommand,
  type ToolExecutionStatus,
} from "../tool-invocations/ToolInvocationTracker";
import { EMPTY_QUEUE_ITEMS } from "../../runtime/queue/queue-item";
import {
  __internal_bindNextDispatchTransform,
  __internal_getDispatchTransform,
} from "../../runtime/queue/message-queue";
import type { QuoteInfo } from "../../types/quote";
import {
  captureThreadRuntimeDisposal,
  captureThreadRuntimeGeneration,
} from "../../runtime/utils/thread-runtime-lifecycle";
import { RunLeases, type RunLease } from "../../utils/run-lease";

const EMPTY_ARRAY: readonly ThreadSuggestion[] = Object.freeze([]);

const queuedMessageRuntimes = new WeakMap<
  AppendMessage,
  ExternalStoreThreadRuntimeCore
>();

type SubmittedFeedback = NonNullable<
  ThreadAssistantMessage["metadata"]["submittedFeedback"]
>;

type SubmittedFeedbackOverlay = {
  feedback: SubmittedFeedback;
  external: SubmittedFeedback | undefined;
  source: ThreadAssistantMessage;
  message: ThreadAssistantMessage;
};

const sameSubmittedFeedback = (
  left: SubmittedFeedback | undefined,
  right: SubmittedFeedback | undefined,
) => left?.type === right?.type && left?.comment === right?.comment;

type RetainedToolInvocations = {
  host: ExternalStoreThreadRuntimeCore;
  readonly tracker: ToolInvocationTracker;
};

// Tool executions belong to the conversation, not to one runtime: a host that
// remounts its runtime with the same repository instance hands them to the new
// runtime, which then delivers their results and stops them.
const retainedToolInvocations = new WeakMap<
  MessageRepository,
  RetainedToolInvocations
>();

const observeAdapterCallback = (
  name: "onAddToolResult" | "onCancel",
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
    answerToolCall: false,
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
  public get hasEarlier() {
    return (
      this._store.hasEarlier === true && this._store.onLoadEarlier !== undefined
    );
  }
  private _loadingEarlier: Promise<void> | undefined;
  public get isLoadingEarlier() {
    return this._loadingEarlier !== undefined;
  }
  public loadEarlier(): Promise<void> {
    if (this._loadingEarlier) return this._loadingEarlier;
    const onLoadEarlier = this._store.onLoadEarlier;
    if (!this.hasEarlier || !onLoadEarlier) return Promise.resolve();
    const loading = Promise.resolve()
      .then(() => onLoadEarlier())
      .catch((error: unknown) => {
        console.error(
          "[ExternalStoreThreadRuntimeCore] onLoadEarlier callback rejected",
          error,
        );
      })
      .finally(() => {
        this._loadingEarlier = undefined;
        this._notifySubscribers();
      });
    this._loadingEarlier = loading;
    this._notifySubscribers();
    return loading;
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
  /** @deprecated Experimental since 2026-08-02. Not scheduled for removal; the API may change in any release. */
  public get unstable_refetchThread(): (() => Promise<void>) | undefined {
    if (!this._store.onRefetchThread) return undefined;
    return () => this._store.onRefetchThread!();
  }

  public suggestions: readonly ThreadSuggestion[] = [];
  public extras: unknown = undefined;

  private _converter = new ThreadMessageConverter();
  private _submittedFeedback = new Map<string, SubmittedFeedbackOverlay>();

  // Ids the host was asked to delete via onDelete, mapped to the onDelete
  // calls still pending for them. The snapshot pass evicts them from the
  // repository once the host's array no longer carries them; an id the host
  // still carries after every onDelete call for it settled, resolved or
  // rejected, is dropped from the map without eviction.
  // Branch-changing mutations (edit, branch switch) invalidate the map,
  // because after them the incoming array omits off-branch ids for reasons
  // unrelated to deletion. A reload keeps only the prefix up to the parent it
  // regenerates from in the host's array: an id absent from that prefix is
  // still a deletion, but an id after the parent is absent whether or not its
  // delete was declined. The snapshot pass leaves such an id alone while an
  // onDelete call for it is pending; a rejection drops it, and a resolution
  // applies the usual rule to the host's current array. Plain tail sends do
  // not clear: a tail append cannot make a visible id absent, so id-absence
  // stays unambiguous and a delete whose confirmation races a send keeps its
  // eviction.
  private _pendingDeleteEvictions = new Map<
    string,
    {
      calls: Set<symbol>;
      reloaded: boolean;
      message: ThreadMessage;
    }
  >();

  // Placeholder id for the upcoming assistant message, reused across snapshot
  // passes while the same tail message awaits its response so the placeholder
  // keeps one identity per response.
  private _optimistic: { id: string; parentId: string | null } | null = null;

  // The last host branch with locally submitted feedback applied, or the array
  // last handed to setMessages, whichever was written last. Excludes the
  // optimistic placeholder so cancel resync only writes a real rollback.
  private _storeMessages: readonly ThreadMessage[] = [];
  private _importedMessageIds: readonly string[] | undefined;

  private readonly _runStartLeases = new RunLeases();
  private readonly _runCancellationLeases = new RunLeases();
  private readonly _cancelRunResyncLeases = new RunLeases();
  private _cancelledToolTurn: {
    messageIds: Set<string>;
    parentId: string | null;
    parentOpen: boolean;
    lease: RunLease;
  } | null = null;
  private readonly _pendingCancelResyncs = new Set<() => void>();
  private _movedLeaf:
    | {
        id: string;
        draft: {
          text: string;
          attachments: readonly Attachment[];
          quote: QuoteInfo | undefined;
        };
        resyncLease: ReturnType<RunLeases["current"]>;
        generation: ReturnType<typeof captureThreadRuntimeGeneration>;
      }
    | undefined;

  private _store!: ExternalStoreAdapter<any>;

  private _getInitializePromise?: () => Promise<unknown> | undefined;

  public __internal_setGetInitializePromise(
    getPromise: () => Promise<unknown> | undefined,
  ) {
    this._getInitializePromise = getPromise;
  }

  private _queueDispatchTransform = (message: AppendMessage): AppendMessage => {
    const currentTransform =
      this._transformedQueue &&
      __internal_getDispatchTransform(this._transformedQueue);
    if (
      currentTransform &&
      captureThreadRuntimeDisposal(this).aborted &&
      currentTransform !== this._queueDispatchTransform
    )
      return currentTransform(message);
    const owner = currentTransform
      ? undefined
      : queuedMessageRuntimes.get(message);
    const runtime =
      owner && !captureThreadRuntimeDisposal(owner).aborted ? owner : this;
    runtime._settleCancelResyncs();
    const parentId = runtime.messages.at(-1)?.id ?? null;
    return runtime.enrichAppendMetadata({ ...message, parentId }, parentId);
  };

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

  protected override _onMessageMetadataChanged(
    previousMessage: ThreadAssistantMessage,
    message: ThreadAssistantMessage,
  ): void {
    this._storeMessages = this._storeMessages.map((storedMessage) =>
      storedMessage.id === message.id ? message : storedMessage,
    );
    if (message.id.startsWith(FALLBACK_ID_PREFIX)) return;
    const previousOverlay = this._submittedFeedback.get(message.id);
    const external =
      previousOverlay &&
      sameSubmittedFeedback(
        previousMessage.metadata.submittedFeedback,
        previousOverlay.feedback,
      )
        ? previousOverlay.external
        : previousMessage.metadata.submittedFeedback;
    const feedback = message.metadata.submittedFeedback;
    if (!feedback) return;
    this._submittedFeedback.set(message.id, {
      feedback,
      external,
      source:
        previousOverlay?.message === previousMessage
          ? previousOverlay.source
          : previousMessage,
      message,
    });
  }

  private _applySubmittedFeedback(
    messages: readonly ThreadMessage[],
  ): readonly ThreadMessage[] {
    if (this._submittedFeedback.size === 0) return messages;
    // An array host omits off-branch messages that the repository still keeps, so the overlay keeps an entry for as long as the repository holds its message.
    for (const id of this._submittedFeedback.keys()) {
      try {
        this.repository.getMessage(id);
      } catch {
        this._submittedFeedback.delete(id);
      }
    }

    return messages.map((message) => {
      const overlay = this._submittedFeedback.get(message.id);
      if (!overlay) return message;
      if (
        message.role !== "assistant" ||
        !sameSubmittedFeedback(
          message.metadata.submittedFeedback,
          overlay.external,
        )
      ) {
        this._submittedFeedback.delete(message.id);
        return message;
      }

      if (overlay.source === message) return overlay.message;
      const updatedMessage = {
        ...message,
        metadata: {
          ...message.metadata,
          submittedFeedback: overlay.feedback,
        },
      };
      overlay.source = message;
      overlay.message = updatedMessage;
      return updatedMessage;
    });
  }

  /**
   * Tracker mutations initiated by this class (setState, reset) can publish
   * status changes synchronously. Re-entering the snapshot pipeline from
   * inside them would feed the tracker a stale snapshot and consume the
   * restore arming a reset just installed, so the running refresh is
   * deferred until the mutation returns and re-derives the published
   * messages without feeding the tracker.
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
    if (this._effectiveIsRunning === this._getEffectiveIsRunning(this._store))
      return;
    this._updateStoreSnapshot(this._store, false);
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

  private _evictPlaceholder() {
    if (!this._optimistic) return;
    try {
      this.repository.getMessage(this._optimistic.id);
    } catch {
      return;
    }
    this.repository.deleteMessage(this._optimistic.id);
  }

  private _updateStoreSnapshot(
    store: ExternalStoreAdapter<any>,
    fromHostSnapshot = true,
    force = false,
  ) {
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
      this._cancelledToolTurn = null;
      this._pendingDeleteEvictions.clear();
      this._submittedFeedback.clear();
      this._movedLeaf = undefined;
      // Keep the live placeholder so resetHead cannot evict an id still used
      // by clients rendering the previous snapshot.
      const head = this.repository.getMessages();
      const tail = head.at(-1);
      this._optimistic = tail?.metadata.isOptimistic
        ? { id: tail.id, parentId: head.at(-2)?.id ?? null }
        : null;
    }
    if (oldStore?.queue !== store.queue) {
      this._transformedQueue = undefined;
      store.queue?.__internal_setDispatchTransform?.(
        this._queueDispatchTransform,
      );
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
      answerToolCall:
        this._store.onAddToolResult !== undefined ||
        this._store.onResumeToolCall !== undefined ||
        this._store.onRespondToToolApproval !== undefined ||
        this._store.unstable_enableToolInvocations === true,
    };
    if (!shallowEqual(this._capabilities, newCapabilities)) {
      this._capabilities = newCapabilities;
    }

    let messages: readonly ThreadMessage[];
    let preservingImportedMessages = false;
    let importPathChanged = false;

    if (store.messageRepository) {
      // Handle messageRepository
      this._importedMessageIds = undefined;
      if (
        !force &&
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
      this._evictPlaceholder();

      if (
        oldStore &&
        !force &&
        !repositoryChanged &&
        oldStore.messageRepository === store.messageRepository
      ) {
        this.repository.import({ headId, messages: [] });
        messages = this.repository.getMessages();
      } else {
        const incomingIds = new Set(incoming.map(({ message }) => message.id));
        const reconciledMessages = this._applySubmittedFeedback(
          incoming.map(({ message }) => message),
        );
        for (let i = 0; i < incoming.length; i++) {
          this.repository.addOrUpdateMessage(
            incoming[i]!.parentId,
            reconciledMessages[i]!,
          );
        }
        for (const { message } of this.repository.export().messages) {
          if (!incomingIds.has(message.id)) {
            this.repository.deleteMessage(message.id);
          }
        }
        this._pendingDeleteEvictions.clear();
        this.repository.import({ headId, messages: [] });
        messages = this.repository.getMessages();
      }
    } else if (store.messages) {
      // Handle messages array

      if (oldStore) {
        // flush the converter cache when the convertMessage prop changes
        if (oldStore.convertMessage !== store.convertMessage) {
          this._converter = new ThreadMessageConverter();
        } else if (
          !force &&
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

      messages = this._applySubmittedFeedback(messages);
      const importedMessageIds = this._importedMessageIds;
      preservingImportedMessages =
        importedMessageIds !== undefined &&
        shallowArrayEqual(
          importedMessageIds,
          messages.map((message) => message.id),
        );
      if (!preservingImportedMessages) {
        importPathChanged = importedMessageIds !== undefined;
        this._importedMessageIds = undefined;
      }

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i]!;
        const parent = messages[i - 1];
        this.repository.addOrUpdateMessage(parent?.id ?? null, message);
      }

      // A pass over the host's previous array, such as a client tool's
      // running refresh, can predate the host's answer to onDelete.
      if (
        this._pendingDeleteEvictions.size > 0 &&
        oldStore?.messages !== store.messages
      ) {
        const incomingIds = new Set(messages.map((m) => m.id));
        for (const [id, pending] of this._pendingDeleteEvictions) {
          if (pending.reloaded) continue;
          if (incomingIds.has(id)) {
            if (pending.calls.size === 0)
              this._pendingDeleteEvictions.delete(id);
            continue;
          }
          this._pendingDeleteEvictions.delete(id);
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
    this._storeMessages = messages;
    if (messages.length > 0) this.ensureInitialized();

    const movedLeaf = this._movedLeaf;
    if (movedLeaf) {
      if (
        movedLeaf.generation.aborted ||
        !movedLeaf.resyncLease.isCurrent() ||
        this.composer.text !== movedLeaf.draft.text
      ) {
        this._movedLeaf = undefined;
      } else {
        const index = messages.findIndex((m) => m.id === movedLeaf.id);
        if (index !== -1) {
          if (getThreadMessageText(messages[index]!) !== movedLeaf.draft.text) {
            this._movedLeaf = undefined;
          } else if (index < messages.length - 1) {
            this.composer.retractDraft(movedLeaf.draft);
            this._movedLeaf = undefined;
          }
        }
      }
    }

    this._effectiveIsRunning = isRunning;
    if (previousIsRunning !== isRunning) {
      if (isRunning) {
        const scope = this._cancelledToolTurn;
        if (scope?.lease.isCurrent()) {
          const tail = messages.at(-1);
          if (tail?.role === "assistant" && scope.messageIds.has(tail.id)) {
            this._cancelledToolTurn = null;
          } else {
            const parentId =
              tail?.role === "assistant"
                ? (messages.at(-2)?.id ?? null)
                : (tail?.id ?? null);
            if (parentId === scope.parentId) scope.parentOpen = false;
          }
        }
        this._notifyEventSubscribers("runStart", {});
      } else {
        this._notifyEventSubscribers("runEnd", {});
      }
    }

    // Append an optimistic placeholder while running but before a trailing
    // assistant message exists. Setting the head evicts off-branch optimistic
    // messages (prior placeholders, mid-run id-swap siblings); export() never
    // persists them.
    let optimisticId: string | null = null;
    if (hasUpcomingMessage(isRunning, messages)) {
      const parentId = messages.at(-1)?.id ?? null;
      if (importPathChanged) {
        this.repository.resetHead(parentId);
      }
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
    const visibleHeadId = optimisticId ?? messages.at(-1)?.id ?? null;
    if (store.messageRepository || preservingImportedMessages) {
      this.repository.import({ headId: visibleHeadId, messages: [] });
    } else {
      this.repository.resetHead(visibleHeadId);
    }

    const messagesSnapshot = this.repository.getMessages();
    if (
      !this._messages ||
      !shallowArrayEqual(this._messages, messagesSnapshot)
    ) {
      this._messages = messagesSnapshot;
    }

    if (this._voiceMessages.length > 0) {
      const hostIds = new Set(this._messages.map((message) => message.id));
      const remaining = this._voiceMessages.filter(
        (message) => !hostIds.has(message.id),
      );
      if (remaining.length !== this._voiceMessages.length) {
        this._voiceMessages = remaining;
        this._markVoiceMessagesDirty();
      }
    }

    if (fromHostSnapshot) {
      if (repositoryChanged) {
        this._runTrackerUpdate(() => this._toolInvocations?.reset());
      }
      this._runTrackerUpdate(() => this._driveToolInvocations());
    }

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

    let retained = retainedToolInvocations.get(this.repository);
    if (!retained) {
      retained = this._createToolInvocations();
      retainedToolInvocations.set(this.repository, retained);
    }
    this._toolInvocations = retained.tracker;
    if (retained.host !== this) {
      if (retained.host._toolInvocations === retained.tracker)
        retained.host._toolInvocations = null;
      retained.host = this;
      const statuses = retained.tracker.getStatuses();
      if (statuses.size > 0 || this._toolStatuses.size > 0)
        this._applyToolStatuses(statuses);
    }

    const discardedToolCallIds = this._getDiscardedToolCallIds();
    this._toolInvocations.setState({
      messages: this._messages,
      isRunning: this._getEffectiveIsRunning(this._store),
      ...(discardedToolCallIds && { discardedToolCallIds }),
      ...(this._store.isLoading !== undefined && {
        isLoading: this._store.isLoading,
      }),
    });
  }

  private _getDiscardedToolCallIds(): ReadonlySet<string> | undefined {
    const scope = this._cancelledToolTurn;
    if (!scope) return undefined;

    const ids = new Set<string>();
    for (let i = 0; i < this._messages.length; i++) {
      const message = this._messages[i]!;
      if (message.role !== "assistant" || message.metadata.isOptimistic)
        continue;
      if (!scope.messageIds.has(message.id)) {
        if (
          !scope.parentOpen ||
          (this._messages[i - 1]?.id ?? null) !== scope.parentId
        )
          continue;
        scope.messageIds.add(message.id);
      }
      for (const { part } of walkToolCallTree([message])) {
        ids.add(part.toolCallId);
      }
    }
    return ids;
  }

  private _createToolInvocations(): RetainedToolInvocations {
    const retained: RetainedToolInvocations = {
      host: this,
      tracker: new ToolInvocationTracker(
        () => retained.host.getModelContext().tools,
        {
          onResult: (command) => retained.host._dispatchToolResult(command),
          onStatusesChange: (statuses) =>
            retained.host._applyToolStatuses(statuses),
        },
        (toolCall) =>
          retained.host._store.unstable_isClientToolCall?.(toolCall),
      ),
    };
    return retained;
  }

  private _dispatchToolResult(command: AddToolResultCommand): void {
    try {
      const messageId = this._findMessageIdForToolCall(command.toolCallId);
      if (messageId === undefined) {
        // The tool call no longer exists in the snapshot (e.g. rolled back).
        // Drop the result.
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
  }

  private _applyToolStatuses(
    statuses: ReadonlyMap<string, ToolExecutionStatus>,
  ): void {
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
      for (const { part, messageId } of walkToolCallTree(this._messages)) {
        this._toolCallToMessageId.set(part.toolCallId, messageId);
      }
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
    let message = {
      ...rawMessage,
      parentId: this._resolveAppendParent(rawMessage.parentId),
    };
    if (this.voice) return this._appendToVoiceSession(message);
    if (this._isVoiceMessage(message.sourceId))
      throw new Error("Voice transcript messages cannot be edited");
    // sourceId marks an edit send; the parent may coincide with the head
    // after a resync (e.g. cancelRun dropped the edited message).
    const isEdit =
      message.sourceId != null ||
      message.parentId !== (this._getBaseMessages().at(-1)?.id ?? null);

    // A transformed-queue send is stamped at flush; any other queue's
    // transform would gate against its own thread's messages, so those stamp
    // at send.
    const stamped =
      !isEdit &&
      this._store.queue &&
      this._store.queue === this._transformedQueue
        ? undefined
        : this.enrichAppendMetadata(message);

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
      if (generation.aborted) return;
    }

    // Read after the barrier, which the host may have used to replace or
    // drop its queue.
    const queue = isEdit ? undefined : this._store.queue;

    if (!queue || queue !== this._transformedQueue)
      message = stamped ?? this.enrichAppendMetadata(message);

    if (queue) {
      if (queue === this._transformedQueue) {
        if (!__internal_getDispatchTransform(queue))
          queuedMessageRuntimes.set(message, this);
        queue.__internal_setDispatchTransform?.(this._queueDispatchTransform);
        __internal_bindNextDispatchTransform(queue);
      }
      // Buffering does not start a run, so the tool-abort below must wait
      // until the queue flushes. By then the prior run (and its tools) has
      // settled.
      if (message.steer ?? this._getEffectiveIsRunning(this._store))
        queue.steer(message);
      else queue.enqueue(message);
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
      const toolsSettled = this._toolInvocations?.abort({
        discardPending: true,
      });
      if (toolsSettled && toolsSettled !== NO_TOOL_EXECUTIONS)
        await toolsSettled;
    }
    if (generation.aborted) return;

    this._settleCancelResyncs();

    if (isEdit) {
      if (!this._store.onEdit)
        throw new Error("Runtime does not support editing messages.");
      this._pendingDeleteEvictions.clear();
      await this._store.onEdit(message);
    } else {
      await this._store.onNew(message);
    }
  }

  protected override _commitVoiceMessage(
    message: ThreadMessage,
  ): void | Promise<void> {
    const generation = captureThreadRuntimeGeneration(this);
    if (generation.aborted) {
      this._dropVoiceMessage(message.id, false);
      return;
    }
    const barrier = this._getVoiceCommitBarrier();
    if (!barrier) {
      this._store.onVoiceTranscript?.(message);
      return;
    }
    // A React host recreates its callbacks on the render that ends the load,
    // so the delivery reads the adapter current then rather than the callback
    // that produced the message. The repository is the one conversation
    // identity that survives those renders and moves when a host routes
    // another conversation through this runtime; a host that swaps only its
    // messages is indistinguishable from a load finishing.
    const repository = this.repository;
    return barrier.then(() => {
      if (generation.aborted || this.repository !== repository) {
        this._dropVoiceMessage(message.id, true);
        return;
      }
      this._store.onVoiceTranscript?.(message);
    });
  }

  public async deleteMessage(messageId: string): Promise<void> {
    if (this._store.onDelete) {
      // The host owns deletion here, and it may decline (fail a server call,
      // cancel a confirm dialog, ignore an off-branch id). The eviction is
      // therefore deferred to the snapshot pass, which evicts only once the
      // host's own array no longer carries the id. Registered before the
      // callback because an optimistic host publishes that snapshot while
      // the callback is still awaited.
      const visibleMessage = this.repository
        .getMessages()
        .find((m) => m.id === messageId);
      const call = Symbol();
      let pending = this._pendingDeleteEvictions.get(messageId);
      if (visibleMessage) {
        if (
          !pending ||
          (messageId.startsWith(FALLBACK_ID_PREFIX) &&
            pending.message !== visibleMessage)
        ) {
          pending = {
            calls: new Set<symbol>(),
            reloaded: false,
            message: visibleMessage,
          };
        }
        pending.calls.add(call);
        this._pendingDeleteEvictions.set(messageId, pending);
      }
      let resolved = false;
      try {
        await this._store.onDelete(messageId);
        resolved = true;
      } finally {
        if (
          pending &&
          this._pendingDeleteEvictions.get(messageId) === pending &&
          pending.calls.delete(call)
        ) {
          if (pending.reloaded && resolved) {
            pending.reloaded = false;
            if (!this._storeMessages.some((m) => m.id === messageId)) {
              this._pendingDeleteEvictions.delete(messageId);
              this._evictDeletedMessage(messageId, pending.message);
            }
          } else if (pending.reloaded && pending.calls.size === 0) {
            this._pendingDeleteEvictions.delete(messageId);
          }
        }
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
  private _evictDeletedMessage(
    messageId: string,
    expectedMessage?: ThreadMessage,
  ) {
    // Positional fallback ids can be reused by another message after a snapshot.
    if (messageId.startsWith(FALLBACK_ID_PREFIX) && !expectedMessage) return;
    // A synchronous host update (e.g. a setMessages that re-entered the
    // snapshot pass) may have evicted the message already; only that case is
    // skipped, so genuine repository errors still propagate.
    try {
      const current = this.repository.getMessage(messageId).message;
      if (
        messageId.startsWith(FALLBACK_ID_PREFIX) &&
        current !== expectedMessage
      )
        return;
    } catch {
      return;
    }

    this.repository.deleteMessage(messageId);
    this._publishRepositoryMessages();
  }

  // Notifies even when the visible messages are unchanged: deleting an
  // off-branch message still changes the branch counts subscribers read.
  private _publishRepositoryMessages() {
    const messages = this.repository.getMessages();
    if (!shallowArrayEqual(this._messages, messages)) this._messages = messages;
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

  private _restoreMovedLeafForRun(parentId: string | null): void {
    const movedLeaf = this._movedLeaf;
    if (
      movedLeaf?.id === parentId &&
      movedLeaf.resyncLease.isCurrent() &&
      !movedLeaf.generation.aborted &&
      this._storeMessages.some((message) => message.id === movedLeaf.id)
    ) {
      this._cancelRunResyncLeases.invalidate();
      this._movedLeaf = undefined;
      this.composer.retractDraft(movedLeaf.draft);
      this._updateStoreSnapshot(this._store, false, true);
    }
  }

  public async startRun(config: StartRunConfig): Promise<void> {
    if (!this._store.onReload)
      throw new Error("Runtime does not support reloading messages.");
    if (this.voice)
      throw new Error("Cannot start a run while a voice session is connected");
    if (this._isVoiceMessage(config.sourceId))
      throw new Error("Voice transcript messages cannot be reloaded");

    this._restoreMovedLeafForRun(config.parentId);
    this._runStartLeases.begin();
    if (this._cancelledToolTurn?.parentId === config.parentId)
      this._cancelledToolTurn.parentOpen = false;
    const visible = this.repository.getMessages();
    const kept = new Set(
      visible
        .slice(0, visible.findIndex((m) => m.id === config.parentId) + 1)
        .map((m) => m.id),
    );
    for (const [id, pending] of this._pendingDeleteEvictions) {
      if (kept.has(id)) continue;
      if (pending.calls.size > 0) pending.reloaded = true;
      else this._pendingDeleteEvictions.delete(id);
    }

    const cancellationLease = this._runCancellationLeases.current();
    // Auto-abort in-flight client-side tool executions when a run reloads;
    // any results that land afterward would target a turn that no longer
    // exists. See `append` above for full rationale.
    await this._toolInvocations?.abort({
      discardPending: true,
    });
    if (!cancellationLease.isCurrent()) return;

    await this._store.onReload(config.parentId, config);
  }

  public async resumeRun(config: ResumeRunConfig): Promise<void> {
    if (!this._store.onResume)
      throw new Error("Runtime does not support resuming runs.");
    if (this.voice)
      throw new Error("Cannot start a run while a voice session is connected");
    if (this._isVoiceMessage(config.sourceId))
      throw new Error("Voice transcript messages cannot be reloaded");

    this._restoreMovedLeafForRun(config.parentId);
    this._runStartLeases.begin();
    this._cancelledToolTurn = null;
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

    this._cancelRunResyncLeases.invalidate();
    this._cancelledToolTurn = null;

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
   *
   * @deprecated Experimental since 2026-08-14. Not scheduled for removal; the API may change in any release.
   */
  public unstable_notifySessionReset(): void {
    this._cancelRunResyncLeases.invalidate();
    this._cancelledToolTurn = null;
    this._runTrackerUpdate(() => this._toolInvocations?.reset());
    this._store.queue?.__internal_notifyCancelled?.();
  }

  public cancelRun(): void {
    if (!this._store.onCancel)
      throw new Error("Runtime does not support cancelling runs.");

    const isRunning = this._getEffectiveIsRunning(this._store);
    this._runCancellationLeases.invalidate();
    const generation = captureThreadRuntimeGeneration(this);
    const resyncLease = this._cancelRunResyncLeases.current();

    if (isRunning) {
      const hostMessages = this._storeMessages.filter(
        (message) => !message.metadata.isOptimistic,
      );
      const tail = hostMessages.at(-1);
      this._cancelledToolTurn = {
        messageIds: new Set(tail?.role === "assistant" ? [tail.id] : []),
        parentId:
          tail?.role === "assistant"
            ? (hostMessages.at(-2)?.id ?? null)
            : (tail?.id ?? null),
        parentOpen: true,
        lease: this._runStartLeases.current(),
      };
    }

    // Abort any in-flight client-side tool executions. Fire-and-forget —
    // the abort resolves once executions settle, but we don't gate the
    // cancel on it.
    void this._toolInvocations?.abort({ discardPending: true });

    // Before the run is aborted, so the settle it produces keeps the pending
    // items instead of dispatching the next one at the moment the user
    // stopped.
    this._store.queue?.__internal_notifyCancelled?.();

    observeAdapterCallback("onCancel", this._store.onCancel());

    this.dropEmptyOptimisticHead();

    const messages = this.repository.getMessages();
    const previousMessage = messages[messages.length - 1];
    const cancelledTailId = previousMessage?.id ?? null;
    const runStartLease = this._runStartLeases.current();
    const trailingUserLeaf =
      isRunning &&
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
    let movedLeaf: typeof this._movedLeaf;
    if (trailingUserLeaf) {
      const draft = {
        text: getThreadMessageText(trailingUserLeaf),
        attachments: trailingUserLeaf.attachments,
        quote: trailingUserLeaf.metadata.custom.quote as QuoteInfo | undefined,
      };
      if (this.composer.restoreDraft(draft)) {
        this.repository.deleteMessage(trailingUserLeaf.id);
        movedLeaf = {
          id: trailingUserLeaf.id,
          draft,
          resyncLease,
          generation,
        };
        this._movedLeaf = movedLeaf;
      }
    }
    this._publishRepositoryMessages();

    // The resync commits the rollback to the store a macrotask later. The
    // store may move in that gap; a server settling the cancelled turn lands
    // in the same tick. Read the repository at flush time and re-apply the
    // rollbacks to it, instead of stamping a snapshot captured above over the
    // newer state. A send runs it early so the rollback reaches the store
    // before the message does, and the timer still runs it last.
    const resync = () => {
      if (generation.aborted || !resyncLease.isCurrent()) return;

      // A placeholder under a message other than the cancelled tail, or one
      // following a reload or resume issued after the cancel, belongs to a
      // run that started after the cancel, so the rollback leaves it.
      const startedSinceCancel =
        this._getEffectiveIsRunning(this._store) &&
        (!runStartLease.isCurrent() ||
          (this.repository.getMessages().at(-2)?.id ?? null) !==
            cancelledTailId);
      if (!startedSinceCancel) this.dropEmptyOptimisticHead();
      if (movedLeaf) {
        const current = this.repository.getMessages();
        if (
          this._movedLeaf === movedLeaf &&
          current.at(-1)?.id === movedLeaf.id &&
          this.composer.text === movedLeaf.draft.text
        ) {
          // Unanswered tail: the removal has not reached the store yet.
          this.repository.deleteMessage(movedLeaf.id);
        }
      }
      this._publishRepositoryMessages();

      // setMessages replaces the whole array, and the host may hold updates
      // this runtime has not received yet, so it is called only when the
      // rollback left something the host does not already hold.
      const view = this._messages.filter((m) => m.id !== this._optimistic?.id);
      if (!shallowArrayEqual(view, this._storeMessages))
        this.updateMessages(view);
    };
    this._pendingCancelResyncs.add(resync);
    setTimeout(() => {
      this._pendingCancelResyncs.delete(resync);
      resync();
    }, 0);
  }

  private _settleCancelResyncs(): void {
    for (const resync of this._pendingCancelResyncs) resync();
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

  public respondToToolApproval(
    options: RespondToToolApprovalOptions,
  ): Promise<void> {
    if (!this._store.onRespondToToolApproval)
      throw new Error("Runtime does not support tool approvals.");
    const message = this.messages.findLast(
      (candidate) =>
        candidate.role === "assistant" &&
        candidate.content.some(
          (part) =>
            part.type === "tool-call" &&
            part.approval?.id === options.approvalId,
        ),
    );
    const toolCall = message?.content.find(
      (part) =>
        part.type === "tool-call" && part.approval?.id === options.approvalId,
    );
    try {
      return Promise.resolve(this._store.onRespondToToolApproval(options)).then(
        () => {
          if (message && toolCall?.type === "tool-call") {
            this._notifyToolApprovalAnswered(
              message.id,
              toolCall.toolCallId,
              toolCall.toolName,
              options.approved,
            );
          }
        },
      );
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /** @deprecated Experimental since 2026-09-23. Not scheduled for removal; the API may change in any release. */
  public async unstable_recordToolInteraction(
    options: Unstable_RecordToolInteractionOptions,
  ): Promise<void> {
    if (!this._store.unstable_onRecordToolInteraction)
      throw new Error("Runtime does not support recording tool interactions.");
    await this._store.unstable_onRecordToolInteraction(options);
  }

  public override reset(initialMessages?: readonly ThreadMessageLike[]) {
    this._cancelRunResyncLeases.invalidate();
    this._cancelledToolTurn = null;
    this._submittedFeedback.clear();
    this._importedMessageIds = undefined;
    const repo = new MessageRepository();
    repo.import(ExportedMessageRepository.fromArray(initialMessages ?? []));
    this.updateMessages(repo.getMessages());
  }

  public override import(data: ExportedMessageRepository) {
    if (!this._store.onImport)
      throw new Error("Runtime does not support importing messages.");

    this._cancelRunResyncLeases.invalidate();
    this._cancelledToolTurn = null;
    this._submittedFeedback.clear();
    super.import(data);
    const messages = this.repository.getMessages();
    this._importedMessageIds = messages.map((message) => message.id);
    this._store.onImport(messages);
  }

  private updateMessages = (messages: readonly ThreadMessage[]) => {
    this._storeMessages = messages;
    const hasConverter = this._store.convertMessage !== undefined;
    if (hasConverter) {
      this._store.setMessages?.(messages.flatMap(getExternalStoreMessages));
    } else {
      // TODO mark this as readonly in v0.12.0
      this._store.setMessages?.(messages as ThreadMessage[]);
    }
  };
}

import type { AppendMessage, ThreadMessage } from "../../types/message";
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
} from "../../runtime/utils/external-store-message";
import { ThreadMessageConverter } from "./thread-message-converter";
import { getAutoStatus, isAutoStatus } from "../../runtime/utils/auto-status";
import {
  fromThreadMessageLike,
  type ThreadMessageLike,
} from "../../runtime/utils/thread-message-like";
import { getThreadMessageText } from "../../utils/text";
import type {
  RuntimeCapabilities,
  ThreadRuntimeCore,
} from "../../runtime/interfaces/thread-runtime-core";
import { BaseThreadRuntimeCore } from "../../runtime/base/base-thread-runtime-core";
import type { ModelContextProvider } from "../../model-context/types";
import {
  ExportedMessageRepository,
  MessageRepository,
} from "../../runtime/utils/message-repository";
import { generateId } from "../../utils/id";
import { ToolInvocationTracker } from "../tool-invocations/ToolInvocationTracker";
import { EMPTY_QUEUE_ITEMS } from "../../store/scopes/queue-item";

const EMPTY_ARRAY: readonly ThreadSuggestion[] = Object.freeze([]);

const shallowEqual = (a: object, b: object): boolean => {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  for (const key of aKeys) {
    if ((a as any)[key] !== (b as any)[key]) return false;
  }
  return true;
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

  public suggestions: readonly ThreadSuggestion[] = [];
  public extras: unknown = undefined;

  private _converter = new ThreadMessageConverter();

  private _store!: ExternalStoreAdapter<any>;

  /**
   * Client-side tool-invocations pipeline. Constructed lazily on first
   * snapshot — only when `adapter.unstable_enableToolInvocations === true`.
   */
  private _toolInvocations: ToolInvocationTracker | null = null;

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

    const isRunning = store.isRunning ?? false;
    this.isDisabled = store.isDisabled ?? false;
    this.isSendDisabled = store.isSendDisabled ?? false;

    const oldStore = this._store as ExternalStoreAdapter<any> | undefined;
    this._store = store;
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
        oldStore.isRunning === store.isRunning &&
        oldStore.messageRepository === store.messageRepository
      ) {
        this._notifySubscribers();
        return;
      }

      const incoming = store.messageRepository.messages;
      const headId =
        store.messageRepository.headId ?? incoming.at(-1)?.message.id ?? null;

      if (oldStore && oldStore.messageRepository === store.messageRepository) {
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
          oldStore.isRunning === store.isRunning &&
          oldStore.messages === store.messages
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
            const autoStatus = getAutoStatus(
              isLast,
              isRunning,
              false,
              false,
              undefined,
            );

            if (
              cache &&
              (cache.role !== "assistant" ||
                !isAutoStatus(cache.status) ||
                cache.status === autoStatus)
            )
              return cache;

            const messageLike = store.convertMessage(m, idx);
            const newMessage = fromThreadMessageLike(
              messageLike,
              idx.toString(),
              autoStatus,
            );
            bindExternalStoreMessage(newMessage, m);
            return newMessage;
          });

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i]!;
        const parent = messages[i - 1];
        this.repository.addOrUpdateMessage(parent?.id ?? null, message);
      }
    } else {
      throw new Error(
        "ExternalStoreAdapter must provide either 'messages' or 'messageRepository'",
      );
    }

    // Common logic for both paths
    if (messages.length > 0) this.ensureInitialized();

    if ((oldStore?.isRunning ?? false) !== (store.isRunning ?? false)) {
      if (store.isRunning) {
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
      optimisticId = generateId();
      this.repository.addOrUpdateMessage(
        messages.at(-1)?.id ?? null,
        fromThreadMessageLike(
          { role: "assistant", content: [], metadata: { isOptimistic: true } },
          optimisticId,
          { type: "running" },
        ),
      );
    }

    this.repository.resetHead(optimisticId ?? messages.at(-1)?.id ?? null);

    this._messages = this.repository.getMessages();

    this._driveToolInvocations();

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
              });
            } catch (err) {
              console.error(
                "[ExternalStoreThreadRuntimeCore] onAddToolResult dispatch failed",
                err,
              );
            }
          },
          onStatusesChange: (statuses) => {
            this._store.setToolStatuses?.(Object.fromEntries(statuses));
          },
        },
      );
    }

    this._toolInvocations.setState({
      messages: this._messages,
      isRunning: this._store.isRunning ?? false,
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
    if (this._store.isRunning) {
      return;
    }

    const onBranchChange = this._store.unstable_onBranchChange;
    const previousHeadId = onBranchChange
      ? (this.repository.export().headId ?? null)
      : null;

    this.repository.switchToBranch(branchId);
    this.updateMessages(this.repository.getMessages());
    if (onBranchChange) {
      this._notifyBranchChange(previousHeadId, onBranchChange);
    }
  }

  /**
   * Emit `unstable_onBranchChange` for an explicit branch switch. Reads the
   * canonical head from `repository.export()` (which skips optimistic/transient
   * messages) and de-dupes switches that leave the canonical head unchanged.
   * Comparing against the head observed just before the switch — rather than the
   * last emitted head — keeps a switch firing after an adapter resync moved the
   * head elsewhere in the meantime.
   */
  private _notifyBranchChange(
    previousHeadId: string | null,
    onBranchChange: (event: ExternalStoreBranchChange) => void,
  ): void {
    const headId = this.repository.export().headId ?? null;
    if (headId === previousHeadId) return;

    onBranchChange({
      headId,
      visibleMessageIds: this.repository.getMessages().map((m) => m.id),
    });
  }

  public async append(message: AppendMessage): Promise<void> {
    const isEdit = message.parentId !== (this.messages.at(-1)?.id ?? null);

    // Buffering does not start a run, so the tool-abort below must wait until
    // the queue flushes. By then the prior run (and its tools) has settled.
    if (!isEdit && this._store.queue) {
      this._store.queue.enqueue(message, { steer: message.steer ?? false });
      return;
    }

    // Auto-abort in-flight client-side tool executions when a new run is
    // about to start. Without this, a tool that finishes after the new turn
    // begins would feed a stale result into `onAddToolResult`, racing with
    // the new turn the user just initiated. `startRun` defaults to true for
    // user messages — matches the satellites' historical opt-in cancel
    // behavior, which is now built in.
    if (message.startRun ?? message.role === "user") {
      await this._toolInvocations?.abort();
    }

    if (isEdit) {
      if (!this._store.onEdit)
        throw new Error("Runtime does not support editing messages.");
      this._store.queue?.clear("edit");
      await this._store.onEdit(message);
    } else {
      await this._store.onNew(message);
    }
  }

  public async deleteMessage(messageId: string): Promise<void> {
    if (this._store.onDelete) {
      await this._store.onDelete(messageId);
      return;
    }

    if (!this._store.setMessages)
      throw new Error("Runtime does not support deleting messages.");

    if (this._store.isRunning) {
      await this._toolInvocations?.abort();
    }

    const messages = this.repository.getMessages();
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) throw new Error("Message not found.");

    this.updateMessages(messages.filter((message) => message.id !== messageId));
  }

  public getQueueItems() {
    // The composer reads this during base-thread construction, before the
    // constructor assigns `_store`, so guard against the unset field.
    return this._store?.queue?.items ?? EMPTY_QUEUE_ITEMS;
  }

  public steerQueueItem(queueItemId: string) {
    this._store?.queue?.steer(queueItemId);
  }

  public removeQueueItem(queueItemId: string) {
    this._store?.queue?.remove(queueItemId);
  }

  public async startRun(config: StartRunConfig): Promise<void> {
    if (!this._store.onReload)
      throw new Error("Runtime does not support reloading messages.");

    this._store.queue?.clear("reload");

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
    // back here via __internal_setAdapter. We only clear adapter-side
    // tool statuses when the tracker is the source of truth — otherwise
    // we'd wipe statuses the adapter is managing on its own.
    if (this._toolInvocations) {
      this._toolInvocations.reset();
      this._store.setToolStatuses?.({});
    }

    this._store.onLoadExternalState(state);
  }

  public cancelRun(): void {
    if (!this._store.onCancel)
      throw new Error("Runtime does not support cancelling runs.");

    this._store.queue?.clear("cancel-run");

    // Abort any in-flight client-side tool executions. Fire-and-forget —
    // the abort resolves once executions settle, but we don't gate the
    // cancel on it.
    void this._toolInvocations?.abort();

    this._store.onCancel();

    // Drop an empty optimistic head (placeholder or pre-stream message); a
    // partially-streamed one is kept and re-supplied by the store on resync.
    const head = this.repository.getMessages().at(-1);
    if (head && head.metadata.isOptimistic && head.content.length === 0) {
      this.repository.deleteMessage(head.id);
    }

    let messages = this.repository.getMessages();
    const previousMessage = messages[messages.length - 1];
    if (
      previousMessage?.role === "user" &&
      previousMessage.id === messages.at(-1)?.id // ensure the previous message is a leaf node
    ) {
      this.repository.deleteMessage(previousMessage.id);
      if (!this.composer.text.trim()) {
        this.composer.setText(getThreadMessageText(previousMessage));
      }

      messages = this.repository.getMessages();
    } else {
      this._notifySubscribers();
    }

    // resync messages (for reloading, to restore the previous branch)
    setTimeout(() => {
      this.updateMessages(messages);
    }, 0);
  }

  public addToolResult(options: AddToolResultOptions) {
    if (!this._store.onAddToolResult)
      throw new Error("Runtime does not support tool results.");
    this._store.onAddToolResult?.(options);
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
    this._store.onRespondToToolApproval(options);
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

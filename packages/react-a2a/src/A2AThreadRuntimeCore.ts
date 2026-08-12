"use client";

import { generateId, fromThreadMessageLike } from "@assistant-ui/core";
import type {
  AppendMessage,
  AssistantRuntime,
  ExportedMessageRepository,
  MessageStatus,
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import { MessageRepository } from "@assistant-ui/core/internal";
import type { A2AClient } from "./A2AClient";
import type {
  A2AArtifact,
  A2AAgentCard,
  A2AMessage,
  A2APart,
  A2ASendMessageConfiguration,
  A2AStreamEvent,
  A2ATask,
  A2ATaskArtifactUpdateEvent,
  A2ATaskStatusUpdateEvent,
} from "./types";
import {
  a2aMessageToContent,
  contentPartsToA2AParts,
  isTerminalTaskState,
  taskStateToMessageStatus,
} from "./conversions";

export type A2AThreadRuntimeCoreOptions = {
  client: A2AClient;
  contextId?: string | undefined;
  configuration?: A2ASendMessageConfiguration | undefined;
  onError?: ((error: Error) => void) | undefined;
  onCancel?: (() => void) | undefined;
  onArtifactComplete?: ((artifact: A2AArtifact) => void) | undefined;
  history?: ThreadHistoryAdapter | undefined;
  notifyUpdate: () => void;
};

const DEFAULT_HISTORY_ADAPTER_KEY = Symbol("history-adapter");
const NO_HISTORY_ADAPTER_KEY = Symbol("no-history-adapter");
type HistoryAdapterKey =
  | NonNullable<ThreadHistoryAdapter["key"]>
  | typeof DEFAULT_HISTORY_ADAPTER_KEY
  | typeof NO_HISTORY_ADAPTER_KEY;

const getHistoryAdapterKey = (
  history: ThreadHistoryAdapter | undefined,
): HistoryAdapterKey =>
  history
    ? (history.key ?? DEFAULT_HISTORY_ADAPTER_KEY)
    : NO_HISTORY_ADAPTER_KEY;

const FALLBACK_USER_STATUS = {
  type: "complete",
  reason: "unknown",
} as const;

export class A2AThreadRuntimeCore {
  private client: A2AClient;
  private contextId: string | undefined;
  private configuration: A2ASendMessageConfiguration | undefined;
  private onError: ((error: Error) => void) | undefined;
  private onCancel: (() => void) | undefined;
  private onArtifactComplete: ((artifact: A2AArtifact) => void) | undefined;
  private history: ThreadHistoryAdapter | undefined;
  private readonly notifyUpdate: () => void;

  private runtime: AssistantRuntime | undefined;
  private readonly repository = new MessageRepository();
  private exportedRepository: ExportedMessageRepository | undefined;
  private isRunningFlag = false;
  private abortController: AbortController | null = null;
  private abortControllerClient: A2AClient | null = null;
  private pendingError: Error | null = null;

  // A2A-specific state
  private currentTask: A2ATask | undefined;
  private currentArtifacts: A2AArtifact[] = [];
  private agentCardValue: A2AAgentCard | undefined;

  // History tracking
  private readonly assistantHistoryParents = new Map<string, string | null>();
  private readonly recordedHistoryIds = new Set<string>();
  private historyScopeGeneration = 0;
  private _isLoading = false;
  private _loadRequest:
    | {
        key: HistoryAdapterKey;
        historyScopeGeneration: number;
        promise: Promise<void>;
      }
    | undefined;
  private lastHistoryAdapterKey: HistoryAdapterKey | undefined;

  constructor(options: A2AThreadRuntimeCoreOptions) {
    this.client = options.client;
    this.contextId = options.contextId;
    this.configuration = options.configuration;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
    this.onArtifactComplete = options.onArtifactComplete;
    if (
      !Object.is(
        getHistoryAdapterKey(this.history),
        getHistoryAdapterKey(options.history),
      )
    ) {
      this.historyScopeGeneration += 1;
    }
    this.history = options.history;
    this.notifyUpdate = options.notifyUpdate;
  }

  updateOptions(options: Omit<A2AThreadRuntimeCoreOptions, "notifyUpdate">) {
    this.client = options.client;
    this.contextId = options.contextId;
    this.configuration = options.configuration;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
    this.onArtifactComplete = options.onArtifactComplete;
    this.history = options.history;
  }

  attachRuntime(runtime: AssistantRuntime) {
    this.runtime = runtime;
  }

  detachRuntime() {
    this.runtime = undefined;
    // Abort in-flight requests on unmount
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  getRuntime(): AssistantRuntime | undefined {
    return this.runtime;
  }

  getMessages(): readonly ThreadMessage[] {
    return this.repository.getMessages();
  }

  getMessageRepository(): ExportedMessageRepository {
    this.exportedRepository ??= this.repository.export();
    return this.exportedRepository;
  }

  private tryGetMessage(messageId: string) {
    try {
      return this.repository.getMessage(messageId);
    } catch {
      return undefined;
    }
  }

  private tryGetMessages(
    messageId: string,
  ): readonly ThreadMessage[] | undefined {
    try {
      return this.repository.getMessages(messageId);
    } catch {
      return undefined;
    }
  }

  private hasMessage(messageId: string): boolean {
    return this.tryGetMessage(messageId) !== undefined;
  }

  private addOrUpdateMessage(
    parentId: string | null,
    message: ThreadMessage,
  ): void {
    this.repository.addOrUpdateMessage(parentId, message);
    this.exportedRepository = undefined;
  }

  private switchToBranch(messageId: string): void {
    this.repository.switchToBranch(messageId);
    this.exportedRepository = undefined;
  }

  private resetRepositoryHead(messageId: string | null): void {
    this.repository.resetHead(messageId);
    this.exportedRepository = undefined;
  }

  private clearRepository(): void {
    this.repository.clear();
    this.exportedRepository = undefined;
  }

  private updateMessage(
    messageId: string,
    updater: (message: ThreadMessage) => ThreadMessage,
  ): boolean {
    const item = this.tryGetMessage(messageId);
    if (!item) return false;
    const message = updater(item.message);
    if (message === item.message) return false;
    this.addOrUpdateMessage(item.parentId, message);
    return true;
  }

  getTask(): A2ATask | undefined {
    return this.currentTask;
  }

  getArtifacts(): readonly A2AArtifact[] {
    return this.currentArtifacts;
  }

  getAgentCard(): A2AAgentCard | undefined {
    return this.agentCardValue;
  }

  isRunning(): boolean {
    return this.isRunningFlag;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  __internal_load(): Promise<void> {
    const history = this.history;
    const key = getHistoryAdapterKey(history);
    const activeLoadRequest = this._loadRequest;
    if (
      activeLoadRequest &&
      Object.is(activeLoadRequest.key, key) &&
      activeLoadRequest.historyScopeGeneration === this.historyScopeGeneration
    ) {
      return activeLoadRequest.promise;
    }

    const replacingHistory =
      this.lastHistoryAdapterKey !== undefined &&
      !Object.is(this.lastHistoryAdapterKey, key);
    if (replacingHistory) {
      this.historyScopeGeneration += 1;
      this.clearRepository();
      this.assistantHistoryParents.clear();
      this.recordedHistoryIds.clear();
      this.pendingError = null;
      void this.cancelWithClient(
        this.abortControllerClient ?? this.client,
        false,
      );
      this.currentTask = undefined;
      this.currentArtifacts = [];
    }

    const request = {
      key,
      historyScopeGeneration: this.historyScopeGeneration,
      promise: Promise.resolve(),
    };
    const isCurrentRequest = () =>
      this._loadRequest === request &&
      request.historyScopeGeneration === this.historyScopeGeneration;
    this._loadRequest = request;
    this.lastHistoryAdapterKey = key;

    this._isLoading = true;
    this.notifyUpdate();

    const historyPromise = history?.load() ?? Promise.resolve(null);
    const agentCardPromise = this.client.getAgentCard().catch(() => undefined);

    request.promise = Promise.all([historyPromise, agentCardPromise])
      .then(([repo, agentCard]) => {
        if (!isCurrentRequest()) return;
        if (agentCard) {
          this.agentCardValue = agentCard;
        }
        if (repo) {
          this.applyExternalMessageRepository(repo);
        }
      })
      .catch((error) => {
        if (!isCurrentRequest()) return;
        this.onError?.(
          error instanceof Error ? error : new Error(String(error)),
        );
      })
      .finally(() => {
        if (!isCurrentRequest()) return;
        this._isLoading = false;
        this.notifyUpdate();
      });

    return request.promise;
  }

  async append(message: AppendMessage): Promise<void> {
    const startRun = message.startRun ?? message.role === "user";

    const threadMessage = fromThreadMessageLike(
      message as any,
      generateId(),
      FALLBACK_USER_STATUS,
    );
    const parentId =
      message.parentId === null
        ? null
        : message.parentId && this.hasMessage(message.parentId)
          ? message.parentId
          : this.repository.headId;
    this.addOrUpdateMessage(parentId, threadMessage);
    this.switchToBranch(threadMessage.id);
    this.notifyUpdate();
    this.recordHistoryEntry(parentId, threadMessage);

    if (!startRun) return;
    await this.startRun(threadMessage);
  }

  async edit(message: AppendMessage): Promise<void> {
    await this.append(message);
  }

  async reload(
    parentId: string | null,
    _config: { runConfig?: Record<string, unknown> } = {},
  ): Promise<void> {
    const messages =
      parentId === null
        ? []
        : (this.tryGetMessages(parentId) ?? this.getMessages());
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.role === "user") {
        await this.startRun(messages[i]!);
        return;
      }
    }
  }

  async cancel(): Promise<void> {
    await this.cancelWithClient(
      this.abortControllerClient ?? this.client,
      true,
    );
  }

  private async cancelWithClient(client: A2AClient, applyTaskUpdate: boolean) {
    const abortController = this.abortController;
    if (!abortController) return;

    // Abort locally first so the stream stops immediately
    abortController.abort();

    // Then try to cancel the task on the server
    if (this.currentTask?.id) {
      try {
        const updated = await client.cancelTask(this.currentTask.id);
        if (applyTaskUpdate) {
          this.currentTask = updated;
        }
      } catch {
        // Server cancel failed; local abort already handled
      }
    }
  }

  private appendLinearChain(messages: readonly ThreadMessage[]): string | null {
    let parentId: string | null = null;
    let lastId: string | null = null;
    const seen = new Set<string>();

    for (const message of messages) {
      if (seen.has(message.id)) continue;
      seen.add(message.id);
      this.addOrUpdateMessage(parentId, message);
      parentId = message.id;
      lastId = message.id;
    }

    return lastId;
  }

  private finalizeExternalApply(): void {
    this.assistantHistoryParents.clear();
    this.recordedHistoryIds.clear();
    for (const { message } of this.getMessageRepository().messages) {
      this.recordedHistoryIds.add(message.id);
    }
    this.currentTask = undefined;
    this.currentArtifacts = [];
    this.notifyUpdate();
  }

  applyExternalMessages(messages: readonly ThreadMessage[]): void {
    if (messages.length === 0) {
      this.clearRepository();
    } else {
      let expectedParentId: string | null = null;
      let lastAppliedId: string | null = null;
      let hardReplace = false;
      const seen = new Set<string>();

      for (const message of messages) {
        if (seen.has(message.id)) continue;
        seen.add(message.id);
        const existing = this.tryGetMessage(message.id);
        if (existing && existing.parentId !== expectedParentId) {
          hardReplace = true;
          break;
        }
        this.addOrUpdateMessage(expectedParentId, message);
        expectedParentId = message.id;
        lastAppliedId = message.id;
      }

      if (hardReplace) {
        this.clearRepository();
        lastAppliedId = this.appendLinearChain(messages);
      }

      this.resetRepositoryHead(lastAppliedId);
    }

    this.finalizeExternalApply();
  }

  private applyExternalMessageRepository(
    loaded: ExportedMessageRepository,
  ): void {
    const headId = loaded.headId ?? loaded.messages.at(-1)?.message.id ?? null;
    const ids = new Set<string>();
    let degenerate = false;
    for (const { message } of loaded.messages) {
      if (ids.has(message.id)) {
        degenerate = true;
        break;
      }
      ids.add(message.id);
    }
    if (headId !== null && !ids.has(headId)) degenerate = true;

    if (!degenerate) {
      this.clearRepository();
      let pending = [...loaded.messages];
      const importedIds = new Set<string>();

      while (pending.length > 0) {
        const unresolved: typeof pending = [];
        let progressed = false;
        for (const item of pending) {
          if (item.parentId !== null && !importedIds.has(item.parentId)) {
            unresolved.push(item);
            continue;
          }
          this.addOrUpdateMessage(item.parentId, item.message);
          importedIds.add(item.message.id);
          progressed = true;
        }
        if (!progressed) {
          degenerate = true;
          break;
        }
        pending = unresolved;
      }
    }

    if (degenerate) {
      this.clearRepository();
      let previousId: string | null = null;
      for (const { message } of loaded.messages) {
        const existing = this.tryGetMessage(message.id);
        this.addOrUpdateMessage(
          existing ? existing.parentId : previousId,
          message,
        );
        previousId = message.id;
      }
      this.resetRepositoryHead(previousId);
    } else {
      this.resetRepositoryHead(headId);
    }

    this.finalizeExternalApply();
  }

  // --- Run logic ---

  private async startRun(userThreadMessage: ThreadMessage): Promise<void> {
    // Cancel any in-progress run before starting a new one
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      this.abortControllerClient = null;
    }

    const a2aMessage = this.threadMessageToA2AMessage(userThreadMessage);

    // Clear task if previous task reached terminal state
    if (
      this.currentTask &&
      isTerminalTaskState(this.currentTask.status.state)
    ) {
      this.currentTask = undefined;
    }

    this.currentArtifacts = [];

    const assistantParentId = userThreadMessage.id;
    const assistantId = this.insertAssistantPlaceholder(assistantParentId);
    this.markPendingAssistantHistory(assistantId, assistantParentId);

    const abortController = new AbortController();
    this.abortController = abortController;
    this.abortControllerClient = this.client;

    abortController.signal.addEventListener(
      "abort",
      () => {
        this.updateAssistantStatus(assistantId, {
          type: "incomplete",
          reason: "cancelled",
        });
        this.finishRun(abortController);
        this.onCancel?.();
      },
      { once: true },
    );

    this.setRunning(true);

    // Check if agent supports streaming; fall back to sync sendMessage if not
    const supportsStreaming =
      this.agentCardValue?.capabilities?.streaming !== false;

    try {
      if (supportsStreaming) {
        await this.runStreaming(a2aMessage, assistantId, abortController);
      } else {
        await this.runSync(a2aMessage, assistantId, abortController);
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.updateAssistantStatus(assistantId, {
          type: "incomplete",
          reason: "error",
        });
        this.onError?.(err);
        this.pendingError = this.pendingError ?? err;
      }
    } finally {
      this.finishRun(abortController);
    }

    if (this.pendingError) {
      const err = this.pendingError;
      this.pendingError = null;
      throw err;
    }
  }

  private async runStreaming(
    a2aMessage: A2AMessage,
    assistantId: string,
    abortController: AbortController,
  ): Promise<void> {
    const stream = this.client.streamMessage(
      a2aMessage,
      this.configuration,
      undefined, // metadata
      abortController.signal,
    );

    for await (const event of stream) {
      if (abortController.signal.aborted) break;
      this.handleStreamEvent(assistantId, event);
    }

    if (!abortController.signal.aborted) {
      const lastStatus = this.getAssistantStatus(assistantId);
      if (lastStatus?.type === "running") {
        this.updateAssistantStatus(assistantId, {
          type: "complete",
          reason: "stop",
        });
      }
    }
  }

  private async runSync(
    a2aMessage: A2AMessage,
    assistantId: string,
    abortController: AbortController,
  ): Promise<void> {
    const result = await this.client.sendMessage(
      a2aMessage,
      this.configuration,
      undefined, // metadata
      abortController.signal,
    );

    if (abortController.signal.aborted) return;

    // Result is either A2ATask or A2AMessage
    if ("id" in result && "status" in result) {
      // It's a Task
      this.handleTaskSnapshot(assistantId, result as A2ATask);
    } else if ("messageId" in result && "parts" in result) {
      // It's a Message
      this.handleMessage(assistantId, result as A2AMessage);
      this.updateAssistantStatus(assistantId, {
        type: "complete",
        reason: "stop",
      });
    }
  }

  private handleStreamEvent(assistantId: string, event: A2AStreamEvent) {
    switch (event.type) {
      case "statusUpdate":
        this.handleStatusUpdate(assistantId, event.event);
        break;
      case "artifactUpdate":
        this.handleArtifactUpdate(event.event);
        break;
      case "message":
        this.handleMessage(assistantId, event.message);
        break;
      case "task":
        this.handleTaskSnapshot(assistantId, event.task);
        break;
    }
  }

  private handleStatusUpdate(
    assistantId: string,
    event: A2ATaskStatusUpdateEvent,
  ) {
    if (!this.currentTask) {
      this.currentTask = {
        id: event.taskId,
        contextId: event.contextId,
        status: event.status,
      };
    } else {
      this.currentTask = { ...this.currentTask, status: event.status };
    }

    if (event.contextId) {
      this.contextId = event.contextId;
    }

    if (event.status.message) {
      const content = a2aMessageToContent(event.status.message);
      this.updateAssistantContent(assistantId, content);
    }

    const status = taskStateToMessageStatus(event.status.state);
    this.updateAssistantStatus(assistantId, status);

    this.notifyUpdate();
  }

  private handleArtifactUpdate(event: A2ATaskArtifactUpdateEvent) {
    const { artifact, append, lastChunk } = event;
    const existingIdx = this.currentArtifacts.findIndex(
      (a) => a.artifactId === artifact.artifactId,
    );

    let updated: A2AArtifact;
    if (existingIdx >= 0 && append) {
      const existing = this.currentArtifacts[existingIdx]!;
      updated = {
        ...existing,
        parts: [...existing.parts, ...artifact.parts],
      };
      this.currentArtifacts = [
        ...this.currentArtifacts.slice(0, existingIdx),
        updated,
        ...this.currentArtifacts.slice(existingIdx + 1),
      ];
    } else if (existingIdx >= 0) {
      updated = artifact;
      this.currentArtifacts = [
        ...this.currentArtifacts.slice(0, existingIdx),
        updated,
        ...this.currentArtifacts.slice(existingIdx + 1),
      ];
    } else {
      updated = artifact;
      this.currentArtifacts = [...this.currentArtifacts, updated];
    }

    if (lastChunk) {
      this.onArtifactComplete?.(updated);
    }

    this.notifyUpdate();
  }

  private handleMessage(assistantId: string, message: A2AMessage) {
    if (message.role !== "agent") return;

    const content = a2aMessageToContent(message);
    this.updateAssistantContent(assistantId, content);
    this.notifyUpdate();
  }

  private handleTaskSnapshot(assistantId: string, task: A2ATask) {
    this.currentTask = task;

    if (task.contextId) {
      this.contextId = task.contextId;
    }
    if (task.artifacts) {
      this.currentArtifacts = task.artifacts;
    }

    if (task.status.message) {
      const content = a2aMessageToContent(task.status.message);
      this.updateAssistantContent(assistantId, content);
    }

    const status = taskStateToMessageStatus(task.status.state);
    this.updateAssistantStatus(assistantId, status);

    this.notifyUpdate();
  }

  // --- Message helpers ---

  private threadMessageToA2AMessage(message: ThreadMessage): A2AMessage {
    const parts: A2APart[] = [];

    if (message.role === "user") {
      parts.push(...contentPartsToA2AParts(message.content));
      for (const attachment of message.attachments ?? []) {
        parts.push(
          ...contentPartsToA2AParts(
            attachment.content ?? [],
            attachment.contentType,
          ),
        );
      }
    }

    const a2aMsg: A2AMessage = {
      messageId: message.id,
      role: "user",
      parts,
    };

    if (this.contextId) {
      a2aMsg.contextId = this.contextId;
    }
    // Only attach taskId if current task is NOT in terminal state
    if (
      this.currentTask?.id &&
      !isTerminalTaskState(this.currentTask.status.state)
    ) {
      a2aMsg.taskId = this.currentTask.id;
    }

    return a2aMsg;
  }

  private insertAssistantPlaceholder(parentId: string): string {
    const id = generateId();
    const assistant: ThreadAssistantMessage = {
      id,
      role: "assistant",
      createdAt: new Date(),
      status: { type: "running" },
      content: [],
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    };
    this.addOrUpdateMessage(parentId, assistant);
    this.switchToBranch(id);
    this.notifyUpdate();
    return id;
  }

  private updateAssistantContent(
    messageId: string,
    content: ThreadAssistantMessage["content"],
  ) {
    this.updateMessage(messageId, (message) => {
      if (message.role !== "assistant") return message;
      return { ...message, content };
    });
  }

  private updateAssistantStatus(messageId: string, status: MessageStatus) {
    const touched = this.updateMessage(messageId, (message) => {
      if (message.role !== "assistant") return message;
      return { ...message, status };
    });
    if (touched) {
      this.notifyUpdate();
      if (status.type === "complete" || status.type === "incomplete") {
        this.persistAssistantHistory(messageId);
      }
    }
  }

  private getAssistantStatus(messageId: string): MessageStatus | undefined {
    const msg = this.tryGetMessage(messageId)?.message;
    if (msg?.role !== "assistant") return undefined;
    return msg.status;
  }

  // --- Lifecycle helpers ---

  private setRunning(running: boolean) {
    this.isRunningFlag = running;
    this.notifyUpdate();
  }

  private finishRun(controller: AbortController | null) {
    if (this.abortController === controller) {
      this.abortController = null;
      this.abortControllerClient = null;
    }
    this.setRunning(false);
  }

  // --- History persistence ---

  private recordHistoryEntry(parentId: string | null, message: ThreadMessage) {
    this.appendHistoryItem(parentId, message);
  }

  private markPendingAssistantHistory(
    messageId: string,
    parentId: string | null,
  ) {
    if (!this.history) return;
    this.assistantHistoryParents.set(messageId, parentId);
  }

  private persistAssistantHistory(messageId: string) {
    if (!this.history) return;
    const parentId = this.assistantHistoryParents.get(messageId);
    if (parentId === undefined) return;
    const message = this.tryGetMessage(messageId)?.message;
    if (!message || message.role !== "assistant") return;
    if (
      message.status?.type !== "complete" &&
      message.status?.type !== "incomplete"
    )
      return;
    this.assistantHistoryParents.delete(messageId);
    this.appendHistoryItem(parentId, message);
  }

  private appendHistoryItem(parentId: string | null, message: ThreadMessage) {
    const history = this.history;
    if (!history || this.recordedHistoryIds.has(message.id)) return;
    const historyScopeGeneration = this.historyScopeGeneration;
    this.recordedHistoryIds.add(message.id);
    void history.append({ parentId, message }).catch(() => {
      if (historyScopeGeneration !== this.historyScopeGeneration) return;
      this.recordedHistoryIds.delete(message.id);
    });
  }
}

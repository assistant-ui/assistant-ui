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
import {
  createMessageRepositorySession,
  invokeUserCallback,
} from "@assistant-ui/core/internal";
import type { A2AClient } from "./A2AClient";
import type {
  A2AArtifact,
  A2AAgentCard,
  A2AMessage,
  A2ASendMessageConfiguration,
  A2AStreamEvent,
  A2ATask,
  A2ATaskArtifactUpdateEvent,
  A2ATaskStatusUpdateEvent,
} from "./types";
import {
  a2aMessageToContent,
  isTerminalTaskState,
  threadMessageToA2AMessage,
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

const FALLBACK_USER_STATUS = {
  type: "complete",
  reason: "unknown",
} as const;

type A2ARuntimeCallbackName = "onError" | "onCancel" | "onArtifactComplete";

const invokeRuntimeCallback = <TArgs extends readonly unknown[]>(
  name: A2ARuntimeCallbackName,
  callback: ((...args: TArgs) => unknown) | undefined,
  ...args: TArgs
): void => {
  void invokeUserCallback("react-a2a", name, callback, ...args);
};

function normalizeArtifact(artifact: A2AArtifact): A2AArtifact {
  return {
    ...artifact,
    parts: Array.isArray(artifact.parts) ? artifact.parts : [],
  };
}

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
  private readonly session = createMessageRepositorySession();
  private isRunningFlag = false;
  private abortController: AbortController | null = null;
  private pendingError: Error | null = null;

  // A2A-specific state
  private currentTask: A2ATask | undefined;
  private currentArtifacts: A2AArtifact[] = [];
  private agentCardValue: A2AAgentCard | undefined;

  // History tracking
  private readonly assistantHistoryParents = new Map<string, string | null>();
  private readonly recordedHistoryIds = new Set<string>();
  private _isLoading = false;
  private _loadPromise: Promise<void> | undefined;
  private _loadRequested = false;
  private _agentCardPromise: Promise<void> | undefined;

  private lastOptionsContextId: string | undefined;

  constructor(options: A2AThreadRuntimeCoreOptions) {
    this.client = options.client;
    this.contextId = options.contextId;
    this.lastOptionsContextId = options.contextId;
    this.configuration = options.configuration;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
    this.onArtifactComplete = options.onArtifactComplete;
    this.history = options.history;
    this.notifyUpdate = options.notifyUpdate;
  }

  updateOptions(options: Omit<A2AThreadRuntimeCoreOptions, "notifyUpdate">) {
    this.client = options.client;
    // The hook re-applies options on every render, including renders caused
    // by this core's own notifyUpdate. The option only seeds the context: a
    // re-render with the same value must not clobber a server-assigned
    // contextId learned from the stream.
    if (options.contextId !== this.lastOptionsContextId) {
      this.contextId = options.contextId;
      this.lastOptionsContextId = options.contextId;
    }
    this.configuration = options.configuration;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
    this.onArtifactComplete = options.onArtifactComplete;
    const previousHistory = this.history;
    this.history = options.history;

    if (
      this._loadRequested &&
      !this._loadPromise &&
      !previousHistory &&
      options.history &&
      this.session.getMessages().length === 0
    ) {
      void this.__internal_load();
    }
  }

  /** Thread-boundary reset: applyExternalMessages alone also serves branch
   * switches, deletes, and cancel resyncs, which must keep the live context. */
  resetContext(): void {
    // Restore the seed before aborting: an onCancel callback that starts a
    // new run must not pick up the old thread's context, and its controller
    // must not be discarded.
    const controller = this.abortController;
    this.contextId = this.lastOptionsContextId;
    if (controller) {
      controller.abort();
      if (this.abortController === controller) {
        this.abortController = null;
      }
    }
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
    return this.session.getMessages();
  }

  getMessageRepository(): ExportedMessageRepository {
    return this.session.export();
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
    this._loadRequested = true;
    this._agentCardPromise ??= this.client
      .getAgentCard()
      .then((agentCard) => {
        this.agentCardValue = agentCard;
        this.notifyUpdate();
      })
      .catch(() => undefined);

    if (this._loadPromise) return this._loadPromise;
    if (!this.history) return this._agentCardPromise;

    this._isLoading = true;

    const historyPromise = this.history.load();

    this._loadPromise = Promise.all([historyPromise, this._agentCardPromise])
      .then(([repo]) => {
        if (repo) {
          this.session.applyExternalMessageRepository(repo);
          this.finalizeExternalApply();
        }
      })
      .catch((error) => {
        invokeRuntimeCallback(
          "onError",
          this.onError,
          error instanceof Error ? error : new Error(String(error)),
        );
      })
      .finally(() => {
        this._isLoading = false;
        this.notifyUpdate();
      });

    this.notifyUpdate();
    return this._loadPromise;
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
        : message.parentId && this.session.hasMessage(message.parentId)
          ? message.parentId
          : this.session.headId;
    this.session.addOrUpdateMessage(parentId, threadMessage);
    this.session.switchToBranch(threadMessage.id);
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
        : (this.session.tryGetMessages(parentId) ?? this.getMessages());
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.role === "user") {
        await this.startRun(messages[i]!);
        return;
      }
    }
  }

  async cancel(): Promise<void> {
    if (!this.abortController) return;

    // Abort locally first so the stream stops immediately
    this.abortController.abort();

    // Then try to cancel the task on the server
    if (this.currentTask?.id) {
      try {
        const updated = await this.client.cancelTask(this.currentTask.id);
        this.currentTask = updated;
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
      this.session.addOrUpdateMessage(parentId, message);
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
      this.session.clear();
    } else {
      let expectedParentId: string | null = null;
      let lastAppliedId: string | null = null;
      let hardReplace = false;
      const seen = new Set<string>();

      for (const message of messages) {
        if (seen.has(message.id)) continue;
        seen.add(message.id);
        const existing = this.session.tryGetMessage(message.id);
        if (existing && existing.parentId !== expectedParentId) {
          hardReplace = true;
          break;
        }
        this.session.addOrUpdateMessage(expectedParentId, message);
        expectedParentId = message.id;
        lastAppliedId = message.id;
      }

      if (hardReplace) {
        this.session.clear();
        lastAppliedId = this.appendLinearChain(messages);
      }

      this.session.resetHead(lastAppliedId);
    }

    this.finalizeExternalApply();
  }

  // --- Run logic ---

  private async startRun(userThreadMessage: ThreadMessage): Promise<void> {
    // Cancel any in-progress run before starting a new one
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    const a2aMessage = threadMessageToA2AMessage(userThreadMessage, {
      contextId: this.contextId,
      taskId:
        this.currentTask?.id &&
        !isTerminalTaskState(this.currentTask.status.state)
          ? this.currentTask.id
          : undefined,
    });

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

    abortController.signal.addEventListener(
      "abort",
      () => {
        this.updateAssistantStatus(assistantId, {
          type: "incomplete",
          reason: "cancelled",
        });
        this.finishRun(abortController);
        invokeRuntimeCallback("onCancel", this.onCancel);
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
        invokeRuntimeCallback("onError", this.onError, err);
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

    let receivedEvent = false;
    let skipReason: string | undefined;
    const diagnosedStream = (async function* () {
      const reason = yield* stream;
      if (typeof reason === "string") skipReason = reason;
    })();

    for await (const event of diagnosedStream) {
      if (abortController.signal.aborted) break;
      receivedEvent = true;
      this.handleStreamEvent(assistantId, event);
    }

    if (!abortController.signal.aborted) {
      if (!receivedEvent) {
        throw new Error(
          skipReason
            ? `A2A message stream ended without any events. First skipped frame: ${skipReason}`
            : "A2A message stream ended without any events.",
        );
      }

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
    const { append, lastChunk } = event;
    const artifact = normalizeArtifact(event.artifact);
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
      invokeRuntimeCallback(
        "onArtifactComplete",
        this.onArtifactComplete,
        updated,
      );
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
    const artifacts =
      task.artifacts === undefined
        ? undefined
        : Array.isArray(task.artifacts)
          ? task.artifacts.map(normalizeArtifact)
          : [];
    const history =
      task.history === undefined
        ? undefined
        : Array.isArray(task.history)
          ? task.history
          : [];
    this.currentTask = {
      ...task,
      ...(artifacts === undefined ? {} : { artifacts }),
      ...(history === undefined ? {} : { history }),
    };

    if (task.contextId) {
      this.contextId = task.contextId;
    }
    if (artifacts) {
      this.currentArtifacts = artifacts;
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
    this.session.addOrUpdateMessage(parentId, assistant);
    this.session.switchToBranch(id);
    this.notifyUpdate();
    return id;
  }

  private updateAssistantContent(
    messageId: string,
    content: ThreadAssistantMessage["content"],
  ) {
    this.session.updateMessage(messageId, (message) => {
      if (message.role !== "assistant") return message;
      return { ...message, content };
    });
  }

  private updateAssistantStatus(messageId: string, status: MessageStatus) {
    const touched = this.session.updateMessage(messageId, (message) => {
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
    const msg = this.session.tryGetMessage(messageId)?.message;
    if (msg?.role !== "assistant") return undefined;
    return msg.status;
  }

  // --- Lifecycle helpers ---

  private setRunning(running: boolean) {
    this.isRunningFlag = running;
    this.notifyUpdate();
  }

  private finishRun(controller: AbortController | null) {
    if (this.abortController !== controller) return;
    this.abortController = null;
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
    const message = this.session.tryGetMessage(messageId)?.message;
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
    if (!this.history || this.recordedHistoryIds.has(message.id)) return;
    this.recordedHistoryIds.add(message.id);
    void this.history.append({ parentId, message }).catch(() => {
      this.recordedHistoryIds.delete(message.id);
    });
  }
}

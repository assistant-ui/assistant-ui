"use client";

import { generateId, fromThreadMessageLike } from "@assistant-ui/core/internal";
import type {
  AppendMessage,
  AssistantRuntime,
  MessageStatus,
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
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
  private messages: ThreadMessage[] = [];
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

  constructor(options: A2AThreadRuntimeCoreOptions) {
    this.client = options.client;
    this.contextId = options.contextId;
    this.configuration = options.configuration;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
    this.onArtifactComplete = options.onArtifactComplete;
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
    return this.messages;
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
    if (this._loadPromise) return this._loadPromise;

    this._isLoading = true;

    const historyPromise = this.history?.load() ?? Promise.resolve(null);
    const agentCardPromise = this.client.getAgentCard().catch(() => undefined);

    this._loadPromise = Promise.all([historyPromise, agentCardPromise])
      .then(([repo, agentCard]) => {
        if (agentCard) {
          this.agentCardValue = agentCard;
        }
        if (repo) {
          const messages = repo.messages.map((item) => item.message);
          this.applyExternalMessages(messages);
        }
      })
      .catch((error) => {
        this.onError?.(
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
    if (message.sourceId) {
      this.messages = this.messages.filter(
        (entry) => entry.id !== message.sourceId,
      );
    }
    this.resetHead(message.parentId);

    const threadMessage = fromThreadMessageLike(
      message as any,
      generateId(),
      FALLBACK_USER_STATUS,
    );
    this.messages = [...this.messages, threadMessage];
    this.notifyUpdate();
    this.recordHistoryEntry(message.parentId ?? null, threadMessage);

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
    this.resetHead(parentId);
    this.notifyUpdate();

    // Find the last user message to re-run
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i]!.role === "user") {
        await this.startRun(this.messages[i]!);
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

  applyExternalMessages(messages: readonly ThreadMessage[]): void {
    this.assistantHistoryParents.clear();
    this.messages = [...messages];
    this.recordedHistoryIds.clear();
    for (const message of this.messages) {
      this.recordedHistoryIds.add(message.id);
    }
    // Reset task-specific state to prevent leaking into new thread
    this.currentTask = undefined;
    this.currentArtifacts = [];
    this.notifyUpdate();
  }

  // --- Run logic ---

  private async startRun(userThreadMessage: ThreadMessage): Promise<void> {
    // Cancel any in-progress run before starting a new one
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
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
    const assistantId = this.insertAssistantPlaceholder();
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
      for (const part of message.content) {
        if (part.type === "text") {
          parts.push({ text: part.text });
        } else if (part.type === "image") {
          parts.push({ url: part.image, mediaType: "image/*" });
        }
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

  private insertAssistantPlaceholder(): string {
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
    this.messages = [...this.messages, assistant];
    this.notifyUpdate();
    return id;
  }

  private updateAssistantContent(
    messageId: string,
    content: ThreadAssistantMessage["content"],
  ) {
    this.messages = this.messages.map((message) => {
      if (message.id !== messageId || message.role !== "assistant")
        return message;
      return { ...message, content };
    });
  }

  private updateAssistantStatus(messageId: string, status: MessageStatus) {
    let touched = false;
    this.messages = this.messages.map((message) => {
      if (message.id !== messageId || message.role !== "assistant")
        return message;
      touched = true;
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
    const msg = this.messages.find(
      (m) => m.id === messageId && m.role === "assistant",
    );
    return msg?.status;
  }

  // --- Lifecycle helpers ---

  private setRunning(running: boolean) {
    this.isRunningFlag = running;
    this.notifyUpdate();
  }

  private finishRun(controller: AbortController | null) {
    if (this.abortController === controller) {
      this.abortController = null;
    }
    this.setRunning(false);
  }

  private resetHead(parentId: string | null | undefined) {
    if (!parentId) {
      if (this.messages.length) {
        this.messages = [];
      }
      return;
    }
    const idx = this.messages.findIndex((message) => message.id === parentId);
    if (idx === -1) return;
    this.messages = this.messages.slice(0, idx + 1);
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
    const message = this.messages.find((m) => m.id === messageId);
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

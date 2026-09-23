"use client";

import { generateId, fromThreadMessageLike } from "@assistant-ui/core";
import type {
  AppendMessage,
  AssistantRuntime,
  ExportedMessageRepository,
  MessageStatus,
  ThreadAssistantMessage,
  ThreadAssistantMessagePart,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import {
  createMessageRepositorySession,
  invokeUserCallback,
} from "@assistant-ui/core/internal";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import {
  applyA2uiOperations,
  convertSurfaceToUISpec,
  surfaceToOperations,
  type A2uiState,
} from "@assistant-ui/react-generative-ui/a2ui";
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
  a2uiPartsToOperations,
  isTerminalTaskState,
  threadMessageToA2AMessage,
  taskStateToMessageStatus,
} from "./conversions";

const INITIAL_AGENT_CARD_RETRY_DELAY_MS = 5_000;
const MAX_AGENT_CARD_RETRY_DELAY_MS = 5 * 60_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const storedArtifact = (artifact: A2AArtifact): A2AArtifact => ({
  ...artifact,
  parts: artifact.parts.map(({ raw: _raw, ...part }) => part),
});

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
  private runGeneration = 0;
  private pendingError: Error | null = null;

  // A2A-specific state
  private currentTask: A2ATask | undefined;
  private currentArtifacts: A2AArtifact[] = [];
  private a2uiState: A2uiState = new Map();
  private agentCardValue: A2AAgentCard | undefined;

  // History tracking
  private readonly assistantHistoryParents = new Map<string, string | null>();
  private readonly recordedHistoryIds = new Set<string>();
  private readonly historyWrites = new Map<string, Promise<void>>();
  private _isLoading = false;
  private _loadPromise: Promise<void> | undefined;
  private _historyLoadGeneration = 0;
  private _loadRequested = false;
  private _agentCardPromise: Promise<void> | undefined;
  private _agentCardRetryAfter = 0;
  private _agentCardRetryDelay = INITIAL_AGENT_CARD_RETRY_DELAY_MS;
  private _agentCardDiscoveryFailed = false;

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
    this._historyLoadGeneration++;
    this._isLoading = false;
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

  private loadAgentCard(): Promise<void> {
    if (Date.now() < this._agentCardRetryAfter) return Promise.resolve();

    this._agentCardPromise ??= this.client.getAgentCard().then(
      (agentCard) => {
        this.agentCardValue = agentCard;
        this._agentCardRetryAfter = 0;
        this._agentCardRetryDelay = INITIAL_AGENT_CARD_RETRY_DELAY_MS;
        this._agentCardDiscoveryFailed = false;
        this.notifyUpdate();
      },
      () => {
        this._agentCardDiscoveryFailed = true;
        this._agentCardRetryAfter = Date.now() + this._agentCardRetryDelay;
        this._agentCardRetryDelay = Math.min(
          this._agentCardRetryDelay * 2,
          MAX_AGENT_CARD_RETRY_DELAY_MS,
        );
        this._agentCardPromise = undefined;
      },
    );
    return this._agentCardPromise;
  }

  private async waitForAgentCard(signal: AbortSignal): Promise<boolean> {
    const shouldWait = !this._agentCardDiscoveryFailed;
    const load = this.loadAgentCard();
    if (signal.aborted) return false;
    if (!shouldWait) return true;

    let onAbort!: () => void;
    const abort = new Promise<void>((resolve) => {
      onAbort = resolve;
      signal.addEventListener("abort", onAbort, { once: true });
    });

    try {
      await Promise.race([load, abort]);
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
    return !signal.aborted;
  }

  __internal_load(): Promise<void> {
    this._loadRequested = true;
    const agentCardPromise = this.loadAgentCard();

    if (this._loadPromise) return this._loadPromise;
    if (!this.history) return agentCardPromise;

    this._isLoading = true;

    const generation = this._historyLoadGeneration;
    const historyPromise = this.history.load();

    this._loadPromise = historyPromise
      .then((repo) => {
        if (generation !== this._historyLoadGeneration) return;
        if (repo) {
          this.session.applyExternalMessageRepository(repo);
          this.finalizeExternalApply();
        }
      })
      .catch((error) => {
        if (generation !== this._historyLoadGeneration) return;
        invokeRuntimeCallback(
          "onError",
          this.onError,
          error instanceof Error ? error : new Error(String(error)),
        );
      })
      .finally(() => {
        if (generation !== this._historyLoadGeneration) return;
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

  appendVoiceTranscript(message: ThreadMessage): void {
    const parentId = this.session.headId;
    this.session.addOrUpdateMessage(parentId, message);
    this.session.switchToBranch(message.id);
    this.notifyUpdate();
    this.recordHistoryEntry(parentId, message);
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

    // Read the server target before aborting: the abort listener runs the
    // onCancel callback synchronously, which may clear the thread and with it
    // the task this cancellation is for, or start a new run.
    const task = this.currentTask;
    const generation = this.runGeneration;

    // Abort locally first so the stream stops immediately
    this.abortController.abort();

    // Then try to cancel the task on the server
    if (task?.id) {
      try {
        const updated = await this.client.cancelTask(task.id);
        // Only apply the response while nothing newer exists. A newer snapshot
        // or a cleared thread replaces the task object; a follow-up run that
        // has not emitted yet keeps it, so the run generation is what rules
        // that case out.
        if (this.currentTask === task && this.runGeneration === generation) {
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
    this.a2uiState = new Map();
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
    this.runGeneration++;

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
    this.a2uiState = new Map();

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

    try {
      if (!(await this.waitForAgentCard(abortController.signal))) return;

      const supportsStreaming =
        this.agentCardValue?.capabilities?.streaming !== false;
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
        this.handleArtifactUpdate(assistantId, event.event);
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
      this.applyA2uiParts(event.status.message.parts);
      const content = a2aMessageToContent(event.status.message);
      this.updateAssistantContent(assistantId, content);
    }

    const status = taskStateToMessageStatus(event.status.state);
    this.updateAssistantStatus(assistantId, status);

    this.notifyUpdate();
  }

  private handleArtifactUpdate(
    assistantId: string,
    event: A2ATaskArtifactUpdateEvent,
  ) {
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

    this.applyA2uiParts(artifact.parts);
    this.updateAssistantArtifacts(assistantId);
    this.rebuildAssistantA2uiSurfaces(assistantId);

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

    this.applyA2uiParts(message.parts);
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

    this.a2uiState = new Map();
    for (const message of history ?? []) {
      if (message.role === "agent") this.applyA2uiParts(message.parts);
    }
    for (const artifact of artifacts ?? []) {
      this.applyA2uiParts(artifact.parts);
    }
    if (task.status.message) {
      this.applyA2uiParts(task.status.message.parts);
    }

    if (artifacts) this.updateAssistantArtifacts(assistantId);

    if (task.status.message) {
      const content = a2aMessageToContent(task.status.message);
      this.updateAssistantContent(assistantId, content);
    } else {
      this.rebuildAssistantA2uiSurfaces(assistantId);
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
      return { ...message, content: this.withA2uiSurfaces(content) };
    });
  }

  private applyA2uiParts(parts: readonly A2AMessage["parts"][number][]) {
    const operations = a2uiPartsToOperations(parts);
    if (operations.length === 0) return;
    this.a2uiState = applyA2uiOperations(this.a2uiState, operations).state;
  }

  private a2uiSurfaceParts(): ThreadAssistantMessagePart[] {
    const parts: ThreadAssistantMessagePart[] = [];
    for (const [surfaceId, surface] of this.a2uiState) {
      const { spec } = convertSurfaceToUISpec(surface);
      if (!spec) continue;
      parts.push({
        type: "tool-call",
        toolCallId: `a2ui:${surfaceId}`,
        toolName: "present",
        args: spec as unknown as ReadonlyJSONObject,
        argsText: JSON.stringify(spec),
        result: {},
        artifact: { a2ui: surfaceToOperations(surface) },
      });
    }
    return parts;
  }

  private withA2uiSurfaces(
    content: ThreadAssistantMessage["content"],
  ): ThreadAssistantMessage["content"] {
    const preserved = content.filter(
      (part) =>
        !(part.type === "tool-call" && part.toolCallId.startsWith("a2ui:")),
    );
    return [...preserved, ...this.a2uiSurfaceParts()];
  }

  private rebuildAssistantA2uiSurfaces(messageId: string) {
    const touched = this.session.updateMessage(messageId, (message) => {
      if (message.role !== "assistant") return message;
      return {
        ...message,
        content: this.withA2uiSurfaces(message.content),
      };
    });
    if (touched) this.notifyUpdate();
  }

  private updateAssistantArtifacts(messageId: string) {
    const touched = this.session.updateMessage(messageId, (message) => {
      if (message.role !== "assistant") return message;
      const custom = message.metadata.custom;
      const a2a = isRecord(custom.a2a) ? custom.a2a : {};
      return {
        ...message,
        metadata: {
          ...message.metadata,
          custom: {
            ...custom,
            a2a: {
              ...a2a,
              artifacts: this.currentArtifacts.map(storedArtifact),
            },
          },
        },
      };
    });
    if (touched) this.notifyUpdate();
  }

  private updateAssistantStatus(messageId: string, status: MessageStatus) {
    const touched = this.session.updateMessage(messageId, (message) => {
      if (message.role !== "assistant") return message;
      return { ...message, status };
    });
    if (touched) {
      this.notifyUpdate();
      if (this.isPersistableAssistantStatus(status)) {
        this.persistAssistantHistory(messageId);
      }
    }
  }

  private getAssistantStatus(messageId: string): MessageStatus | undefined {
    const msg = this.session.tryGetMessage(messageId)?.message;
    if (msg?.role !== "assistant") return undefined;
    return msg.status;
  }

  private isPersistableAssistantStatus(status: MessageStatus): boolean {
    return (
      status.type === "complete" ||
      status.type === "incomplete" ||
      (status.type === "requires-action" && status.reason === "interrupt")
    );
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
    void this.appendHistoryItem(parentId, message)?.catch((error) => {
      console.error("[react-a2a] failed to append history entry", error);
    });
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
    if (!this.isPersistableAssistantStatus(message.status)) return;
    const isPausing = message.status.type === "requires-action";

    if (isPausing && !this.history.update) return;

    if (this.recordedHistoryIds.has(messageId)) {
      if (this.history.update) {
        const update = this.history.update.bind(this.history);
        const write = this.chainHistoryWrite(messageId, () =>
          update({ parentId, message }),
        );
        if (!isPausing) {
          this.assistantHistoryParents.delete(messageId);
        }
        void write.then(
          () => {
            this.recordedHistoryIds.add(messageId);
          },
          (error) => {
            const pending = this.historyWrites.get(messageId);
            if (pending === undefined || pending === write) {
              this.assistantHistoryParents.set(messageId, parentId);
            }
            console.error("[react-a2a] failed to update history entry", error);
          },
        );
        return;
      }
      if (!isPausing) {
        this.assistantHistoryParents.delete(messageId);
      }
      return;
    }
    const write = this.appendHistoryItem(parentId, message);
    if (!write) return;
    if (!isPausing) {
      this.assistantHistoryParents.delete(messageId);
    }
    void write.catch((error) => {
      const pending = this.historyWrites.get(messageId);
      if (pending === undefined || pending === write) {
        this.assistantHistoryParents.set(messageId, parentId);
      }
      console.error("[react-a2a] failed to append history entry", error);
    });
  }

  private appendHistoryItem(
    parentId: string | null,
    message: ThreadMessage,
  ): Promise<void> | undefined {
    if (!this.history || this.recordedHistoryIds.has(message.id)) return;
    this.recordedHistoryIds.add(message.id);
    const append = this.history.append.bind(this.history);
    const write = this.chainHistoryWrite(message.id, () =>
      append({ parentId, message }),
    );
    void write.catch(() => {
      this.recordedHistoryIds.delete(message.id);
    });
    return write;
  }

  private chainHistoryWrite(
    id: string,
    write: () => Promise<void>,
  ): Promise<void> {
    const pending = this.historyWrites.get(id);
    let next: Promise<void>;
    if (pending) {
      next = pending.then(write, write);
    } else {
      try {
        next = Promise.resolve(write());
      } catch (error) {
        next = Promise.reject(error);
      }
    }
    this.historyWrites.set(id, next);
    void next.then(
      () => {
        if (this.historyWrites.get(id) === next) {
          this.historyWrites.delete(id);
        }
      },
      () => {
        if (this.historyWrites.get(id) === next) {
          this.historyWrites.delete(id);
        }
      },
    );
    return next;
  }
}

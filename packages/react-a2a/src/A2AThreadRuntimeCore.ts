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
  ToolCallMessagePart,
  Unstable_RecordToolInteractionOptions,
} from "@assistant-ui/core";
import {
  appendToolInteraction,
  createHistoryWriteChain,
  createMessageRepositorySession,
  invokeUserCallback,
  RunLeases,
} from "@assistant-ui/core/internal";
import { surfaceToPresentToolCall } from "@assistant-ui/generative-ui/a2ui";
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
import {
  createA2AThreadState,
  reduceA2AThreadState,
  type A2AThreadState,
} from "./a2aThreadState";

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

export class A2AThreadRuntimeCore {
  private client: A2AClient;
  private state: A2AThreadState;
  private configuration: A2ASendMessageConfiguration | undefined;
  private onError: ((error: Error) => void) | undefined;
  private onCancel: (() => void) | undefined;
  private onArtifactComplete: ((artifact: A2AArtifact) => void) | undefined;
  private history: ThreadHistoryAdapter | undefined;
  private readonly listeners = new Set<() => void>();
  private snapshot:
    | {
        isLoading: boolean;
        isRunning: boolean;
        messageRepository: ExportedMessageRepository;
        task: A2ATask | undefined;
        artifacts: readonly A2AArtifact[];
        agentCard: A2AAgentCard | undefined;
      }
    | undefined;

  private runtime: AssistantRuntime | undefined;
  private readonly session = createMessageRepositorySession();
  private abortController: AbortController | null = null;
  private readonly runLeases = new RunLeases();
  private pendingError: Error | null = null;

  // History tracking
  private readonly assistantHistoryParents = new Map<string, string | null>();
  private readonly recordedHistoryIds = new Set<string>();
  private readonly historyWrites = createHistoryWriteChain();
  private _loadPromise: Promise<void> | undefined;
  private _historyLoadGeneration = 0;
  private _agentCardPromise: Promise<void> | undefined;
  private _agentCardRetryAfter = 0;
  private _agentCardRetryDelay = INITIAL_AGENT_CARD_RETRY_DELAY_MS;
  private _agentCardDiscoveryFailed = false;

  private lastOptionsContextId: string | undefined;

  constructor(options: A2AThreadRuntimeCoreOptions) {
    this.client = options.client;
    this.state = createA2AThreadState(options.contextId);
    this.lastOptionsContextId = options.contextId;
    this.configuration = options.configuration;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
    this.onArtifactComplete = options.onArtifactComplete;
    this.history = options.history;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () =>
    (this.snapshot ??= {
      isLoading: this.state.isLoading,
      isRunning: this.state.isRunning,
      messageRepository: this.session.export(),
      task: this.state.currentTask,
      artifacts: this.state.currentArtifacts,
      agentCard: this.state.agentCard,
    });

  private publishUpdate(): void {
    this.snapshot = undefined;
    for (const listener of this.listeners) listener();
  }

  updateOptions(options: A2AThreadRuntimeCoreOptions) {
    this.client = options.client;
    // The option only seeds the context; a re-render with the same value must
    // not clobber a server-assigned contextId learned from the stream.
    if (options.contextId !== this.lastOptionsContextId) {
      this.state = reduceA2AThreadState(this.state, {
        type: "contextLearned",
        contextId: options.contextId,
      });
      this.lastOptionsContextId = options.contextId;
    }
    this.configuration = options.configuration;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
    this.onArtifactComplete = options.onArtifactComplete;
    const previousHistory = this.history;
    this.history = options.history;

    if (
      this.state.loadRequested &&
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
    const wasLoading = this.state.isLoading;
    // Restore the seed before aborting: an onCancel callback that starts a
    // new run must not pick up the old thread's context, and its controller
    // must not be discarded.
    const controller = this.abortController;
    this.state = reduceA2AThreadState(this.state, {
      type: "resetContext",
      contextId: this.lastOptionsContextId,
    });
    if (controller) {
      controller.abort();
      if (this.abortController === controller) {
        this.abortController = null;
      }
    }
    if (wasLoading) this.publishUpdate();
  }

  attachRuntime(runtime: AssistantRuntime) {
    this.runtime = runtime;
  }

  detachRuntime() {
    this.runtime = undefined;
    // Abort in-flight requests on unmount
    const controller = this.abortController;
    if (controller) {
      controller.abort();
      if (this.abortController === controller) {
        this.abortController = null;
      }
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

  public async recordToolInteraction({
    messageId,
    toolCallId,
    interaction,
  }: Unstable_RecordToolInteractionOptions): Promise<void> {
    const message = this.session.tryGetMessage(messageId)?.message;
    if (!message) {
      throw new Error(
        "Tried to record a tool interaction on a non-existing message",
      );
    }
    if (message.role !== "assistant") {
      throw new Error(
        "Tried to record a tool interaction on a non-assistant message",
      );
    }
    const target = message.content.find(
      (part) => part.type === "tool-call" && part.toolCallId === toolCallId,
    );
    if (!target || target.type !== "tool-call") {
      throw new Error(
        "Tried to record a tool interaction on a non-existing tool call",
      );
    }

    const touched = this.session.updateMessage(messageId, (current) => {
      if (current.role !== "assistant") return current;
      return {
        ...current,
        content: current.content.map((part) =>
          part.type === "tool-call" && part.toolCallId === toolCallId
            ? {
                ...part,
                unstable_interactions: appendToolInteraction(
                  part.unstable_interactions,
                  interaction,
                ),
              }
            : part,
        ),
      };
    });
    if (touched) {
      this.publishUpdate();
      this.persistAssistantHistory(messageId);
    }
  }

  getTask(): A2ATask | undefined {
    return this.state.currentTask;
  }

  getArtifacts(): readonly A2AArtifact[] {
    return this.state.currentArtifacts;
  }

  getAgentCard(): A2AAgentCard | undefined {
    return this.state.agentCard;
  }

  isRunning(): boolean {
    return this.state.isRunning;
  }

  get isLoading(): boolean {
    return this.state.isLoading;
  }

  private loadAgentCard(): Promise<void> {
    if (Date.now() < this._agentCardRetryAfter) return Promise.resolve();

    this._agentCardPromise ??= this.client.getAgentCard().then(
      (agentCard) => {
        this.state = reduceA2AThreadState(this.state, {
          type: "agentCardLoaded",
          agentCard,
        });
        this._agentCardRetryAfter = 0;
        this._agentCardRetryDelay = INITIAL_AGENT_CARD_RETRY_DELAY_MS;
        this._agentCardDiscoveryFailed = false;
        this.publishUpdate();
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
    this.state = reduceA2AThreadState(this.state, { type: "loadRequested" });
    const agentCardPromise = this.loadAgentCard();

    if (this._loadPromise) return this._loadPromise;
    if (!this.history) return agentCardPromise;

    this.state = reduceA2AThreadState(this.state, { type: "loadStarted" });

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
        this.state = reduceA2AThreadState(this.state, { type: "loadFinished" });
        this.publishUpdate();
      });

    this.publishUpdate();
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
    this.publishUpdate();
    this.recordHistoryEntry(parentId, threadMessage);

    if (!startRun) return;
    await this.startRun(threadMessage);
  }

  appendVoiceTranscript(message: ThreadMessage): void {
    const parentId = this.session.headId;
    this.session.addOrUpdateMessage(parentId, message);
    this.session.switchToBranch(message.id);
    this.publishUpdate();
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
    const task = this.state.currentTask;
    const lease = this.runLeases.current();

    // Abort locally first so the stream stops immediately
    this.abortController.abort();

    // Then try to cancel the task on the server
    if (task?.id) {
      try {
        const updated = await this.client.cancelTask(task.id);
        // Only apply the response while nothing newer exists. A newer snapshot
        // or a cleared thread replaces the task object; a follow-up run that
        // has not emitted yet keeps it, so the run lease is what rules
        // that case out.
        if (this.state.currentTask === task && lease.isCurrent()) {
          this.state = reduceA2AThreadState(this.state, {
            type: "taskReplaced",
            task: updated,
          });
          this.publishUpdate();
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
    this.state = reduceA2AThreadState(this.state, { type: "reset" });
    this.publishUpdate();
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
    this.runLeases.begin();

    // Cancel any in-progress run before starting a new one. Its abort runs
    // onCancel synchronously, and a run that callback starts keeps the thread.
    // A listener that throws before finishRun leaves `previous` installed, so
    // only a different, non-null controller counts as a replacement run.
    const previous = this.abortController;
    if (previous) {
      previous.abort();
      if (this.abortController !== previous && this.abortController !== null)
        return;
      this.abortController = null;
    }

    const a2aMessage = threadMessageToA2AMessage(userThreadMessage, {
      contextId: this.state.contextId,
      taskId:
        this.state.currentTask?.id &&
        !isTerminalTaskState(this.state.currentTask.status.state)
          ? this.state.currentTask.id
          : undefined,
    });

    this.state = reduceA2AThreadState(this.state, { type: "prepareRun" });

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
        this.state.agentCard?.capabilities?.streaming !== false;
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
    this.state = reduceA2AThreadState(this.state, {
      type: "statusUpdate",
      event,
    });

    if (event.status.message) {
      const content = a2aMessageToContent(event.status.message);
      this.updateAssistantContent(assistantId, content);
    }

    const status = taskStateToMessageStatus(event.status.state);
    this.updateAssistantStatus(assistantId, status);

    this.publishUpdate();
  }

  private handleArtifactUpdate(
    assistantId: string,
    event: A2ATaskArtifactUpdateEvent,
  ) {
    this.state = reduceA2AThreadState(this.state, {
      type: "artifactUpdate",
      event,
    });
    const updated = this.state.currentArtifacts.find(
      ({ artifactId }) => artifactId === event.artifact.artifactId,
    )!;
    this.updateAssistantArtifacts(assistantId);
    this.rebuildAssistantA2uiSurfaces(assistantId);

    if (event.lastChunk) {
      invokeRuntimeCallback(
        "onArtifactComplete",
        this.onArtifactComplete,
        updated,
      );
    }

    this.publishUpdate();
  }

  private handleMessage(assistantId: string, message: A2AMessage) {
    if (message.role !== "agent") return;

    this.state = reduceA2AThreadState(this.state, {
      type: "a2uiMessage",
      message,
    });
    const content = a2aMessageToContent(message);
    this.updateAssistantContent(assistantId, content);
    this.publishUpdate();
  }

  private handleTaskSnapshot(assistantId: string, task: A2ATask) {
    const previousArtifacts = this.state.currentArtifacts;
    this.state = reduceA2AThreadState(this.state, {
      type: "taskSnapshot",
      task,
    });

    if (
      (task.history !== undefined && task.artifacts !== undefined) ||
      this.state.currentArtifacts.length > previousArtifacts.length
    ) {
      this.updateAssistantArtifacts(assistantId);
    }

    if (task.status.message) {
      const content = a2aMessageToContent(task.status.message);
      this.updateAssistantContent(assistantId, content);
    } else {
      this.rebuildAssistantA2uiSurfaces(assistantId);
    }

    const status = taskStateToMessageStatus(task.status.state);
    this.updateAssistantStatus(assistantId, status);

    this.publishUpdate();
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
    this.publishUpdate();
    return id;
  }

  private updateAssistantContent(
    messageId: string,
    content: ThreadAssistantMessage["content"],
  ) {
    this.session.updateMessage(messageId, (message) => {
      if (message.role !== "assistant") return message;
      return {
        ...message,
        content: this.withA2uiSurfaces(content, message.content),
      };
    });
  }

  private a2uiSurfaceParts(): ThreadAssistantMessagePart[] {
    const parts: ThreadAssistantMessagePart[] = [];
    for (const [surfaceId, surface] of this.state.a2uiState) {
      const { toolCall } = surfaceToPresentToolCall(surfaceId, surface);
      if (!toolCall) continue;
      parts.push({
        type: "tool-call",
        ...toolCall,
      });
    }
    return parts;
  }

  private withA2uiSurfaces(
    content: ThreadAssistantMessage["content"],
    previousContent: ThreadAssistantMessage["content"] = content,
  ): ThreadAssistantMessage["content"] {
    const preserved = content.filter(
      (part) =>
        !(part.type === "tool-call" && part.toolCallId.startsWith("a2ui:")),
    );
    const interactionSource = [...previousContent, ...content];
    return this.withPreservedToolInteractions(interactionSource, [
      ...preserved,
      ...this.a2uiSurfaceParts(),
    ]);
  }

  private withPreservedToolInteractions(
    previousContent: ThreadAssistantMessage["content"],
    content: ThreadAssistantMessage["content"],
  ): ThreadAssistantMessage["content"] {
    const interactions = new Map<
      string,
      ToolCallMessagePart["unstable_interactions"]
    >();
    for (const part of previousContent) {
      if (
        part.type === "tool-call" &&
        part.unstable_interactions !== undefined
      ) {
        interactions.set(part.toolCallId, part.unstable_interactions);
      }
    }
    if (interactions.size === 0) return content;
    return content.map((part) => {
      if (
        part.type !== "tool-call" ||
        part.unstable_interactions !== undefined
      ) {
        return part;
      }
      const unstable_interactions = interactions.get(part.toolCallId);
      return unstable_interactions === undefined
        ? part
        : { ...part, unstable_interactions };
    });
  }

  private rebuildAssistantA2uiSurfaces(messageId: string) {
    const touched = this.session.updateMessage(messageId, (message) => {
      if (message.role !== "assistant") return message;
      return {
        ...message,
        content: this.withA2uiSurfaces(message.content),
      };
    });
    if (touched) this.publishUpdate();
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
              artifacts: this.state.currentArtifacts.map(storedArtifact),
            },
          },
        },
      };
    });
    if (touched) this.publishUpdate();
  }

  private updateAssistantStatus(messageId: string, status: MessageStatus) {
    const touched = this.session.updateMessage(messageId, (message) => {
      if (message.role !== "assistant") return message;
      return { ...message, status };
    });
    if (touched) {
      this.publishUpdate();
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
    this.state = reduceA2AThreadState(this.state, {
      type: running ? "runStarted" : "runFinished",
    });
    this.publishUpdate();
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
    const messageData = this.session.tryGetMessage(messageId);
    const parentId = this.assistantHistoryParents.get(messageId);
    if (parentId === undefined && !this.recordedHistoryIds.has(messageId)) {
      return;
    }
    const resolvedParentId =
      parentId === undefined ? messageData?.parentId : parentId;
    if (resolvedParentId === undefined) return;
    const message = messageData?.message;
    if (!message || message.role !== "assistant") return;
    if (!this.isPersistableAssistantStatus(message.status)) return;
    const isPausing = message.status.type === "requires-action";

    if (isPausing && !this.history.update) return;

    if (this.recordedHistoryIds.has(messageId)) {
      if (this.history.update) {
        const update = this.history.update.bind(this.history);
        const write = this.historyWrites.chain(messageId, () =>
          update({ parentId: resolvedParentId, message }),
        );
        if (!isPausing) {
          this.assistantHistoryParents.delete(messageId);
        }
        void write.then(
          () => {
            this.recordedHistoryIds.add(messageId);
          },
          (error) => {
            const pending = this.historyWrites.pending(messageId);
            if (pending === undefined || pending === write) {
              this.assistantHistoryParents.set(messageId, resolvedParentId);
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
    const write = this.appendHistoryItem(resolvedParentId, message);
    if (!write) return;
    if (!isPausing) {
      this.assistantHistoryParents.delete(messageId);
    }
    void write.catch((error) => {
      const pending = this.historyWrites.pending(messageId);
      if (pending === undefined || pending === write) {
        this.assistantHistoryParents.set(messageId, resolvedParentId);
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
    const write = this.historyWrites.chain(message.id, () =>
      append({ parentId, message }),
    );
    void write.catch(() => {
      this.recordedHistoryIds.delete(message.id);
    });
    return write;
  }
}

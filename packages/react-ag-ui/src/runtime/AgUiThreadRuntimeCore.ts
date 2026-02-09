"use client";

import { INTERNAL } from "@assistant-ui/react";
import type {
  AddToolResultOptions,
  AppendMessage,
  AssistantRuntime,
  ChatModelRunResult,
  MessageStatus,
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/react";
import type { HttpAgent } from "@ag-ui/client";
import type { Logger } from "./logger";
import type { AgUiEvent } from "./types";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import { RunAggregator } from "./adapter/run-aggregator";
import { toAgUiMessages, toAgUiTools } from "./adapter/conversions";
import { createAgUiSubscriber } from "./adapter/subscriber";

type RunConfig = NonNullable<AppendMessage["runConfig"]>;
type ResumeRunConfig = {
  parentId: string | null;
  sourceId: string | null;
  runConfig: RunConfig;
  stream?: unknown;
};

type CoreOptions = {
  agent: HttpAgent;
  logger: Logger;
  showThinking: boolean;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  history?: ThreadHistoryAdapter;
  notifyUpdate: () => void;
};

const FALLBACK_USER_STATUS = { type: "complete", reason: "unknown" } as const;

export class AgUiThreadRuntimeCore {
  private agent: HttpAgent;
  private logger: Logger;
  private showThinking: boolean;
  private onError: ((error: Error) => void) | undefined;
  private onCancel: (() => void) | undefined;
  private readonly notifyUpdate: () => void;

  private runtime: AssistantRuntime | undefined;
  private messages: ThreadMessage[] = [];
  private isRunningFlag = false;
  private abortController: AbortController | null = null;
  private stateSnapshot: ReadonlyJSONValue | undefined;
  private pendingError: Error | null = null;
  private history: ThreadHistoryAdapter | undefined;
  private lastRunConfig: RunConfig | undefined;
  private readonly assistantHistoryParents = new Map<string, string | null>();
  private readonly recordedHistoryIds = new Set<string>();
  private _isLoading = false;
  private _loadPromise: Promise<void> | undefined;

  constructor(options: CoreOptions) {
    this.agent = options.agent;
    this.logger = options.logger;
    this.showThinking = options.showThinking;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
    this.history = options.history;
    this.notifyUpdate = options.notifyUpdate;
  }

  updateOptions(options: Omit<CoreOptions, "notifyUpdate">) {
    this.agent = options.agent;
    this.logger = options.logger;
    this.showThinking = options.showThinking;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
    this.history = options.history;
  }

  attachRuntime(runtime: AssistantRuntime) {
    this.runtime = runtime;
  }

  detachRuntime() {
    this.runtime = undefined;
  }

  getMessages(): readonly ThreadMessage[] {
    return this.messages;
  }

  getState(): ReadonlyJSONValue | undefined {
    return this.stateSnapshot;
  }

  isRunning(): boolean {
    return this.isRunningFlag;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  __internal_load(): Promise<void> {
    if (this._loadPromise) return this._loadPromise;

    const promise = this.history?.load() ?? Promise.resolve(null);

    this._isLoading = true;

    this._loadPromise = promise
      .then(async (repo) => {
        if (!repo) return;

        const messages = repo.messages.map((item) => item.message);
        this.applyExternalMessages(messages);

        if (repo.unstable_resume) {
          const parentId = repo.headId ?? messages.at(-1)?.id ?? null;
          await this.startRun(parentId, this.lastRunConfig);
        }
      })
      .catch((error) => {
        this.logger.error?.("[agui] failed to load history", error);
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

    const threadMessage = this.toThreadMessage(message);
    this.messages = [...this.messages, threadMessage];
    this.notifyUpdate();
    this.recordHistoryEntry(message.parentId ?? null, threadMessage);

    if (!startRun) return;
    await this.startRun(threadMessage.id, message.runConfig);
  }

  async edit(message: AppendMessage): Promise<void> {
    await this.append(message);
  }

  async reload(
    parentId: string | null,
    config: { runConfig?: RunConfig } = {},
  ): Promise<void> {
    this.resetHead(parentId);
    this.notifyUpdate();
    await this.startRun(parentId, config.runConfig);
  }

  async cancel(): Promise<void> {
    if (!this.abortController) return;
    this.abortController.abort();
  }

  async resume(config: ResumeRunConfig): Promise<void> {
    if (config.stream) {
      this.logger.debug?.(
        "[agui] resume stream is not supported, falling back to regular run",
      );
    }
    await this.startRun(
      config.parentId,
      config.runConfig ?? this.lastRunConfig,
    );
  }

  findMessageIdForToolCall(toolCallId: string): string | undefined {
    for (const message of this.messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.content) {
        if (part.type === "tool-call" && part.toolCallId === toolCallId) {
          return message.id;
        }
      }
    }
    return undefined;
  }

  addToolResult(options: AddToolResultOptions): void {
    let updated = false;
    this.messages = this.messages.map((message) => {
      if (message.id !== options.messageId || message.role !== "assistant")
        return message;
      updated = true;
      const assistant = message as ThreadAssistantMessage;
      const content = assistant.content.map((part) => {
        if (part.type !== "tool-call" || part.toolCallId !== options.toolCallId)
          return part;
        return {
          ...part,
          result: options.result,
          artifact: options.artifact,
          isError: options.isError,
        };
      });
      return {
        ...assistant,
        content,
      };
    });

    if (updated) {
      this.notifyUpdate();
    }
  }

  applyExternalMessages(messages: readonly ThreadMessage[]): void {
    this.assistantHistoryParents.clear();
    this.messages = [...messages];
    this.recordedHistoryIds.clear();
    for (const message of this.messages) {
      this.recordedHistoryIds.add(message.id);
    }
    this.notifyUpdate();
  }

  loadExternalState(state: ReadonlyJSONValue): void {
    this.stateSnapshot = state;
    this.notifyUpdate();
  }

  private async startRun(
    parentId: string | null,
    runConfig?: RunConfig,
  ): Promise<void> {
    const normalizedRunConfig = runConfig ?? {};
    this.lastRunConfig = normalizedRunConfig;
    this.resetHead(parentId);
    const historicalMessages = [...this.messages];

    const runId = INTERNAL.generateId();
    this.pendingError = null;
    const input = this.buildRunInput(
      runId,
      normalizedRunConfig,
      historicalMessages,
    );
    const assistantParentId = parentId ?? this.messages.at(-1)?.id ?? null;
    let assistantMessageId: string | undefined;
    const ensureAssistant = () => {
      if (assistantMessageId) return assistantMessageId;
      const created = this.insertAssistantPlaceholder();
      assistantMessageId = created;
      this.markPendingAssistantHistory(created, assistantParentId ?? null);
      return created;
    };

    const aggregator = new RunAggregator({
      showThinking: this.showThinking,
      logger: this.logger,
      emit: (update) => this.updateAssistantMessage(ensureAssistant(), update),
    });
    const dispatch = (event: AgUiEvent) => this.handleEvent(aggregator, event);

    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    this.abortController = abortController;

    abortSignal.addEventListener(
      "abort",
      () => {
        dispatch({ type: "RUN_CANCELLED" });
        this.finishRun(abortController);
        this.onCancel?.();
      },
      { once: true },
    );

    const subscriber = createAgUiSubscriber({
      dispatch,
      runId,
      onRunFailed: (error) => {
        this.pendingError = error;
        this.onError?.(error);
      },
    });

    aggregator.handle({ type: "RUN_STARTED", runId });
    this.setRunning(true);

    try {
      try {
        (this.agent as any).messages = input.messages;
        (this.agent as any).threadId = input.threadId;
      } catch {
        // ignore
      }
      await (this.agent as any).runAgent(input, subscriber, {
        signal: abortSignal,
      });
    } catch (error) {
      if (!abortSignal.aborted) {
        const err = error instanceof Error ? error : new Error(String(error));
        dispatch({ type: "RUN_ERROR", message: err.message });
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

  private buildRunInput(
    runId: string,
    runConfig: RunConfig | undefined,
    historyMessages: readonly ThreadMessage[] | undefined,
  ) {
    const threadId = this.agent.threadId || "main";
    const messages = toAgUiMessages(historyMessages ?? this.messages);
    const context = this.runtime?.thread.getModelContext();
    return {
      threadId,
      runId,
      state: this.stateSnapshot ?? null,
      messages,
      tools: toAgUiTools(context?.tools),
      context: context?.system
        ? [{ description: "system", value: context.system }]
        : [],
      forwardedProps: {
        ...(context?.callSettings ?? {}),
        ...(context?.config ?? {}),
        ...(runConfig?.custom ? { runConfig: runConfig.custom } : {}),
      },
    };
  }

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

  private insertAssistantPlaceholder(): string {
    const id = INTERNAL.generateId();
    const assistant: ThreadAssistantMessage = {
      id,
      role: "assistant",
      createdAt: new Date(),
      status: { type: "running" },
      content: [],
      metadata: {
        unstable_state: this.stateSnapshot ?? null,
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

  private updateAssistantMessage(
    messageId: string,
    update: ChatModelRunResult,
  ) {
    let touched = false;
    let latestStatus: MessageStatus | undefined;
    this.messages = this.messages.map((message) => {
      if (message.id !== messageId || message.role !== "assistant")
        return message;
      touched = true;
      const assistant = message as ThreadAssistantMessage;
      const metadata = update.metadata
        ? this.mergeAssistantMetadata(assistant.metadata, update.metadata)
        : assistant.metadata;
      latestStatus = update.status ?? assistant.status;
      return {
        ...assistant,
        content: (update.content ??
          assistant.content) as ThreadAssistantMessage["content"],
        status: latestStatus,
        metadata,
      };
    });
    if (touched) {
      this.notifyUpdate();
      if (this.isTerminalStatus(latestStatus)) {
        this.persistAssistantHistory(messageId);
      }
    }
  }

  private mergeAssistantMetadata(
    current: ThreadAssistantMessage["metadata"],
    incoming: NonNullable<ChatModelRunResult["metadata"]>,
  ): ThreadAssistantMessage["metadata"] {
    const annotations = incoming.unstable_annotations
      ? [...current.unstable_annotations, ...incoming.unstable_annotations]
      : current.unstable_annotations;
    const data = incoming.unstable_data
      ? [...current.unstable_data, ...incoming.unstable_data]
      : current.unstable_data;
    const steps = incoming.steps
      ? [...current.steps, ...incoming.steps]
      : current.steps;
    return {
      unstable_state:
        incoming.unstable_state !== undefined
          ? incoming.unstable_state
          : current.unstable_state,
      unstable_annotations: annotations,
      unstable_data: data,
      steps,
      custom: incoming.custom
        ? { ...current.custom, ...incoming.custom }
        : current.custom,
    };
  }

  private handleEvent(aggregator: RunAggregator, event: AgUiEvent) {
    switch (event.type) {
      case "STATE_SNAPSHOT": {
        this.stateSnapshot = event.snapshot as ReadonlyJSONValue;
        this.notifyUpdate();
        return;
      }
      case "STATE_DELTA": {
        this.logger.debug?.("[agui] state delta event ignored", event.delta);
        return;
      }
      case "MESSAGES_SNAPSHOT": {
        this.importMessagesSnapshot(event.messages);
        return;
      }
      default:
        aggregator.handle(event);
    }
  }

  private importMessagesSnapshot(rawMessages: readonly unknown[]) {
    try {
      const converted = rawMessages.map((message) =>
        INTERNAL.fromThreadMessageLike(
          message as any,
          INTERNAL.generateId(),
          FALLBACK_USER_STATUS,
        ),
      );
      this.applyExternalMessages(converted);
    } catch (error) {
      this.logger.error?.("[agui] failed to import messages snapshot", error);
    }
  }

  private toThreadMessage(message: AppendMessage): ThreadMessage {
    return INTERNAL.fromThreadMessageLike(
      message as any,
      INTERNAL.generateId(),
      FALLBACK_USER_STATUS,
    );
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

  private isTerminalStatus(status?: MessageStatus): boolean {
    return status?.type === "complete" || status?.type === "incomplete";
  }

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
    if (!this.isTerminalStatus(message.status)) return;
    this.assistantHistoryParents.delete(messageId);
    this.appendHistoryItem(parentId, message);
  }

  private appendHistoryItem(parentId: string | null, message: ThreadMessage) {
    if (!this.history || this.recordedHistoryIds.has(message.id)) return;
    this.recordedHistoryIds.add(message.id);
    void this.history.append({ parentId, message }).catch((error) => {
      this.recordedHistoryIds.delete(message.id);
      this.logger.error?.("[agui] failed to append history entry", error);
    });
  }
}

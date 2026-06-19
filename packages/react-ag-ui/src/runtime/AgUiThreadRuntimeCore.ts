"use client";

import { generateId, fromThreadMessageLike } from "@assistant-ui/core";
import type {
  AddToolResultOptions,
  AppendMessage,
  AssistantRuntime,
  ChatModelRunOptions,
  ChatModelRunResult,
  CreateAppendMessage,
  MessageStatus,
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
  ThreadMessage,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import type { AbstractAgent } from "@ag-ui/client";
import jsonpatch, { type Operation } from "fast-json-patch";
import type { Logger } from "./logger";
import type { AgUiEvent, AgUiInterrupt, AgUiResumeEntry } from "./types";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import {
  AG_UI_METADATA_NAMESPACE,
  type AgUiCustomMetadata,
  RunAggregator,
  tryParseJSON,
} from "./adapter/run-aggregator";
import {
  fromAgUiMessages,
  toAgUiMessages,
  toAgUiTools,
} from "./adapter/conversions";
import { createAgUiSubscriber } from "./adapter/subscriber";

const optimisticPrefix = "__optimistic__";
const generateOptimisticId = () => `${optimisticPrefix}${generateId()}`;
const isOptimisticId = (id: string) => id.startsWith(optimisticPrefix);

const symbolResumeShim = Symbol("agui-resume-shim");

type RunConfig = NonNullable<AppendMessage["runConfig"]>;
type ResumeStream = (
  options: ChatModelRunOptions,
) => AsyncGenerator<ChatModelRunResult, void, unknown>;
type ResumeRunConfig = {
  parentId: string | null;
  sourceId: string | null;
  runConfig: RunConfig;
  stream?: ResumeStream;
};

type CoreOptions = {
  agent: AbstractAgent;
  logger: Logger;
  showThinking: boolean;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  history?: ThreadHistoryAdapter;
  notifyUpdate: () => void;
};

const FALLBACK_USER_STATUS = { type: "complete", reason: "unknown" } as const;

export class AgUiThreadRuntimeCore {
  private agent: AbstractAgent;
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
  private pendingResumeMessageId: string | null = null;

  constructor(options: CoreOptions) {
    this.agent = options.agent;
    this.logger = options.logger;
    this.showThinking = options.showThinking;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
    this.history = options.history;
    this.notifyUpdate = options.notifyUpdate;
    this.installResumeShim();
  }

  updateOptions(options: Omit<CoreOptions, "notifyUpdate">) {
    this.agent = options.agent;
    this.logger = options.logger;
    this.showThinking = options.showThinking;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
    this.history = options.history;
    this.installResumeShim();
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

        if (repo.state !== undefined) {
          this.loadExternalState(repo.state);
        }

        if (repo.unstable_resume) {
          const parentId = repo.headId ?? messages.at(-1)?.id ?? null;
          const resumeStream = this.history?.resume?.bind(this.history);
          await this.startRun(
            parentId,
            this.lastRunConfig,
            undefined,
            resumeStream,
          );
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
    if (startRun) this.assertNoPendingInterrupts();
    const threadMessageId = this.appendEntry(message);
    if (!startRun) return;
    await this.startRun(threadMessageId, message.runConfig);
  }

  private appendEntry(message: AppendMessage): string {
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
    return threadMessage.id;
  }

  async edit(message: AppendMessage): Promise<void> {
    await this.append(message);
  }

  async reload(
    parentId: string | null,
    config: { runConfig?: RunConfig } = {},
  ): Promise<void> {
    this.assertNoPendingInterrupts();
    this.resetHead(parentId);
    this.notifyUpdate();
    await this.startRun(parentId, config.runConfig);
  }

  async cancel(): Promise<void> {
    if (!this.abortController) return;
    this.abortController.abort();
  }

  async resume(config: ResumeRunConfig): Promise<void> {
    this.assertNoPendingInterrupts();
    await this.startRun(
      config.parentId,
      config.runConfig ?? this.lastRunConfig,
      undefined,
      config.stream,
    );
  }

  async resumeInFlightRun(messages: readonly ThreadMessage[]): Promise<void> {
    // Without a resume stream startRun would re-run the agent from scratch.
    const resumeStream = this.history?.resume?.bind(this.history);
    if (!resumeStream) {
      const error = new Error(
        "[agui] unstable_resume requires a ThreadHistoryAdapter with a resume() method; skipping resume after thread switch",
      );
      this.logger.error?.(error.message);
      this.onError?.(error);
      return;
    }
    const parentId = messages.at(-1)?.id ?? null;
    try {
      await this.startRun(
        parentId,
        this.lastRunConfig,
        undefined,
        resumeStream,
      );
    } catch {
      // startRun already reported via onError; don't reject the switch.
    }
  }

  private assertNoPendingInterrupts(): void {
    if (!this.getPendingInterrupts()) return;
    throw new Error(
      "[agui] cannot start a new run while interrupts are pending; resolve them with submitInterruptResponses()",
    );
  }

  getPendingInterrupts(): {
    messageId: string;
    interrupts: readonly AgUiInterrupt[];
  } | null {
    const assistant = this.messages.findLast((m) => m.role === "assistant") as
      | ThreadAssistantMessage
      | undefined;
    if (
      !assistant ||
      assistant.status?.type !== "requires-action" ||
      assistant.status.reason !== "interrupt"
    ) {
      return null;
    }
    const stored = (
      assistant.metadata.custom[AG_UI_METADATA_NAMESPACE] as
        | AgUiCustomMetadata
        | undefined
    )?.interrupts;
    if (!stored?.length) return null;
    return { messageId: assistant.id, interrupts: stored };
  }

  async submitInterruptResponses(
    responses: readonly AgUiResumeEntry[],
  ): Promise<void> {
    const pending = this.getPendingInterrupts();
    if (!pending) {
      throw new Error(
        "[agui] submitInterruptResponses: no pending interrupts on this thread",
      );
    }

    const responsesById = new Map<string, AgUiResumeEntry>();
    for (const entry of responses) {
      if (!entry || typeof entry.interruptId !== "string") {
        throw new Error(
          "[agui] submitInterruptResponses: every entry must have an interruptId",
        );
      }
      if (entry.status !== "resolved" && entry.status !== "cancelled") {
        throw new Error(
          `[agui] submitInterruptResponses: invalid status "${entry.status}" for interrupt ${entry.interruptId}`,
        );
      }
      if (responsesById.has(entry.interruptId)) {
        throw new Error(
          `[agui] submitInterruptResponses: duplicate response for interrupt ${entry.interruptId}`,
        );
      }
      responsesById.set(entry.interruptId, entry);
    }

    const openIds = pending.interrupts.map((i) => i.id);
    const missing = openIds.filter((id) => !responsesById.has(id));
    if (missing.length > 0) {
      throw new Error(
        `[agui] submitInterruptResponses: missing responses for open interrupts: ${missing.join(", ")}`,
      );
    }
    const known = new Set(openIds);
    const unknownIds = [...responsesById.keys()].filter((id) => !known.has(id));
    if (unknownIds.length > 0) {
      throw new Error(
        `[agui] submitInterruptResponses: unknown interrupt ids: ${unknownIds.join(", ")}`,
      );
    }

    const now = Date.now();
    for (const interrupt of pending.interrupts) {
      if (!interrupt.expiresAt) continue;
      const expiry = new Date(interrupt.expiresAt).getTime();
      if (Number.isNaN(expiry)) {
        throw new Error(
          `[agui] submitInterruptResponses: interrupt ${interrupt.id} has malformed expiresAt "${interrupt.expiresAt}"`,
        );
      }
      if (expiry <= now) {
        throw new Error(
          `[agui] submitInterruptResponses: interrupt ${interrupt.id} expired at ${interrupt.expiresAt}`,
        );
      }
    }

    const resume: AgUiResumeEntry[] = openIds.map(
      (id) => responsesById.get(id)!,
    );

    if (this.isRunningFlag) {
      throw new Error(
        "[agui] submitInterruptResponses: a run is already in progress",
      );
    }

    this.clearPendingInterrupts(pending.messageId);
    await this.startRun(pending.messageId, this.lastRunConfig, resume);
  }

  async cancelPendingInterruptsAndAppend(
    message: CreateAppendMessage,
    responses?: readonly AgUiResumeEntry[],
  ): Promise<void> {
    const pending = this.getPendingInterrupts();
    if (!pending) {
      if (responses?.length) {
        throw new Error(
          "[agui] cancelPendingInterruptsAndAppend: no pending interrupts on this thread",
        );
      }
      await this.append(this.normalizeAppendMessage(message));
      return;
    }

    const resume = this.resolveCancelledResume(pending.interrupts, responses);
    if (this.isRunningFlag) {
      throw new Error(
        "[agui] cancelPendingInterruptsAndAppend: a run is already in progress",
      );
    }

    const normalized = this.normalizeAppendMessage(message);
    this.clearPendingInterrupts(pending.messageId);
    const threadMessageId = this.appendEntry(normalized);
    await this.startRun(threadMessageId, normalized.runConfig, resume);
  }

  private normalizeAppendMessage(message: CreateAppendMessage): AppendMessage {
    if (typeof message === "string") {
      return {
        createdAt: new Date(),
        parentId: this.messages.at(-1)?.id ?? null,
        sourceId: null,
        runConfig: {},
        role: "user",
        content: [{ type: "text", text: message }],
        attachments: [],
        metadata: { custom: {} },
      };
    }
    return {
      createdAt: message.createdAt ?? new Date(),
      parentId: message.parentId ?? this.messages.at(-1)?.id ?? null,
      sourceId: message.sourceId ?? null,
      role: message.role ?? "user",
      content: message.content,
      attachments: message.attachments ?? [],
      metadata: message.metadata ?? { custom: {} },
      runConfig: message.runConfig ?? {},
      startRun: message.startRun,
    } as AppendMessage;
  }

  private resolveCancelledResume(
    interrupts: readonly AgUiInterrupt[],
    responses: readonly AgUiResumeEntry[] | undefined,
  ): AgUiResumeEntry[] {
    const openIds = interrupts.map((interrupt) => interrupt.id);
    const known = new Set(openIds);
    const responsesById = new Map<string, AgUiResumeEntry>();
    for (const entry of responses ?? []) {
      if (!entry || typeof entry.interruptId !== "string") {
        throw new Error(
          "[agui] cancelPendingInterruptsAndAppend: every response must have an interruptId",
        );
      }
      if (entry.status !== "resolved" && entry.status !== "cancelled") {
        throw new Error(
          `[agui] cancelPendingInterruptsAndAppend: invalid status "${entry.status}" for interrupt ${entry.interruptId}`,
        );
      }
      if (!known.has(entry.interruptId)) {
        throw new Error(
          `[agui] cancelPendingInterruptsAndAppend: unknown interrupt id ${entry.interruptId}`,
        );
      }
      if (responsesById.has(entry.interruptId)) {
        throw new Error(
          `[agui] cancelPendingInterruptsAndAppend: duplicate response for interrupt ${entry.interruptId}`,
        );
      }
      responsesById.set(entry.interruptId, entry);
    }

    return openIds.map(
      (id) => responsesById.get(id) ?? { interruptId: id, status: "cancelled" },
    );
  }

  private clearPendingInterrupts(messageId: string): void {
    let touched = false;
    this.messages = this.messages.map((message) => {
      if (message.id !== messageId || message.role !== "assistant")
        return message;
      const assistant = message as ThreadAssistantMessage;
      if (
        assistant.status?.type !== "requires-action" ||
        assistant.status.reason !== "interrupt"
      ) {
        return assistant;
      }
      touched = true;
      const aguiMeta = assistant.metadata.custom[AG_UI_METADATA_NAMESPACE] as
        | AgUiCustomMetadata
        | undefined;
      const { interrupts: _drop, ...restAgui } = aguiMeta ?? {};
      const newCustom = { ...assistant.metadata.custom };
      if (Object.keys(restAgui).length > 0) {
        newCustom[AG_UI_METADATA_NAMESPACE] = restAgui;
      } else {
        delete newCustom[AG_UI_METADATA_NAMESPACE];
      }
      return {
        ...assistant,
        status: { type: "complete" as const, reason: "unknown" as const },
        metadata: { ...assistant.metadata, custom: newCustom },
      };
    });
    if (touched) this.notifyUpdate();
  }

  findMessageIdForToolCall(toolCallId: string): string | undefined {
    let fallbackMessageId: string | undefined;
    for (let index = this.messages.length - 1; index >= 0; index--) {
      const message = this.messages[index];
      if (!message || message.role !== "assistant") continue;
      for (const part of message.content) {
        if (part.type !== "tool-call" || part.toolCallId !== toolCallId)
          continue;
        if (!("result" in part) || part.result === undefined) {
          return message.id;
        }
        fallbackMessageId ??= message.id;
      }
    }
    return fallbackMessageId;
  }

  addToolResult(options: AddToolResultOptions): void {
    let updated = false;
    this.messages = this.messages.map((message) => {
      if (message.id !== options.messageId || message.role !== "assistant")
        return message;
      const assistant = message as ThreadAssistantMessage;
      let matchedToolCall = false;
      const content = assistant.content.map((part) => {
        if (part.type !== "tool-call" || part.toolCallId !== options.toolCallId)
          return part;
        matchedToolCall = true;
        return {
          ...part,
          result: options.result,
          artifact: options.artifact,
          isError: options.isError,
        };
      });
      if (!matchedToolCall) return message;
      updated = true;
      return { ...assistant, content };
    });

    if (!updated) return;
    this.notifyUpdate();
    this.maybeResumeAfterToolResults(options.messageId);
  }

  // The continuation fires whether the frontend result lands before
  // RUN_FINISHED (the status flips to requires-action only later, while the
  // run is still draining) or after it.
  private maybeResumeAfterToolResults(messageId: string): void {
    if (!this.maybeCompleteAfterToolResults(messageId)) return;

    if (this.isRunningFlag) {
      // A run is still draining (RUN_FINISHED arrived but the stream has not
      // closed). Defer until startRun's tail so we never start two runs.
      this.pendingResumeMessageId = messageId;
      return;
    }
    this.startResumeRun(messageId);
  }

  private maybeCompleteAfterToolResults(messageId: string): boolean {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message || message.role !== "assistant") return false;
    const assistant = message as ThreadAssistantMessage;
    if (
      assistant.status?.type !== "requires-action" ||
      assistant.status.reason !== "tool-calls"
    ) {
      return false;
    }
    const allResolved = assistant.content.every(
      (part) =>
        part.type !== "tool-call" ||
        ("result" in part && part.result !== undefined),
    );
    if (!allResolved) return false;

    this.messages = this.messages.map((m) =>
      m.id === messageId && m.role === "assistant"
        ? {
            ...(m as ThreadAssistantMessage),
            status: { type: "complete" as const, reason: "unknown" as const },
          }
        : m,
    );
    this.notifyUpdate();
    this.persistAssistantHistory(messageId);
    return true;
  }

  private startResumeRun(messageId: string): void {
    void this.startRun(messageId, this.lastRunConfig).catch((error) => {
      this.onError?.(error instanceof Error ? error : new Error(String(error)));
    });
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
    resume?: AgUiResumeEntry[],
    resumeStream?: ResumeStream,
  ): Promise<void> {
    const normalizedRunConfig = runConfig ?? {};
    this.lastRunConfig = normalizedRunConfig;
    this.resetHead(parentId);
    const historicalMessages = [...this.messages];

    this.pendingError = null;
    const assistantParentId = parentId ?? this.messages.at(-1)?.id ?? null;
    let assistantMessageId: string | undefined;
    const ensureAssistant = () => {
      if (assistantMessageId) return assistantMessageId;
      const created = this.insertAssistantPlaceholder();
      assistantMessageId = created;
      this.markPendingAssistantHistory(created, assistantParentId ?? null);
      return created;
    };

    const applyUpdate = (update: ChatModelRunResult) => {
      const resolved = this.updateAssistantMessage(ensureAssistant(), update);
      if (resolved !== assistantMessageId) {
        assistantMessageId = resolved;
      }
    };

    const aggregator = new RunAggregator({
      showThinking: this.showThinking,
      logger: this.logger,
      emit: applyUpdate,
      onServerMessageId: (serverId) => {
        const placeholder = ensureAssistant();
        if (placeholder === serverId) return;
        this.reassignAssistantId(placeholder, serverId);
        assistantMessageId = serverId;
      },
    });
    const dispatch = (event: AgUiEvent) => this.handleEvent(aggregator, event);

    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    this.abortController = abortController;

    let cancelRun = () => dispatch({ type: "RUN_CANCELLED" });
    abortSignal.addEventListener(
      "abort",
      () => {
        cancelRun();
        this.finishRun(abortController);
        this.onCancel?.();
      },
      { once: true },
    );

    this.setRunning(true);

    try {
      if (resumeStream) {
        // Cancel flips only the status; an aggregator RUN_CANCELLED would emit an empty snapshot and wipe the replayed content.
        cancelRun = () =>
          applyUpdate({ status: { type: "incomplete", reason: "cancelled" } });
        await this.consumeResumeStream(resumeStream, {
          runConfig: normalizedRunConfig,
          threadId: this.agent.threadId || "main",
          parentId: assistantParentId,
          historicalMessages,
          abortSignal,
          ensureAssistant,
          applyUpdate,
          getAssistantMessageId: () => assistantMessageId,
        });
      } else {
        const runId = generateId();
        aggregator.handle({ type: "RUN_STARTED", runId });
        const input = this.buildRunInput(
          runId,
          normalizedRunConfig,
          historicalMessages,
          resume,
        );
        const subscriber = createAgUiSubscriber({
          dispatch,
          runId,
          logger: this.logger,
          onRunFailed: (error) => {
            this.pendingError = error;
            this.onError?.(error);
          },
        });
        try {
          (this.agent as any).messages = input.messages;
          (this.agent as any).threadId = input.threadId;
          (this.agent as any).state = input.state ?? null;
        } catch {
          // ignore
        }
        await (this.agent as any).runAgent(input, subscriber, {
          signal: abortSignal,
        });
      }
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
      this.pendingResumeMessageId = null;
      throw err;
    }

    // A tool result that landed before the run settled deferred its
    // continuation here so a second run never overlaps the first.
    if (this.pendingResumeMessageId !== null) {
      const resumeMessageId = this.pendingResumeMessageId;
      this.pendingResumeMessageId = null;
      if (!abortSignal.aborted) {
        this.startResumeRun(resumeMessageId);
      }
    }
  }

  // Replays a persisted run's snapshots into the existing assistant message, bypassing agent.runAgent so it is not re-invoked.
  private async consumeResumeStream(
    stream: ResumeStream,
    ctx: {
      runConfig: RunConfig;
      threadId: string;
      parentId: string | null;
      historicalMessages: readonly ThreadMessage[];
      abortSignal: AbortSignal;
      ensureAssistant: () => string;
      applyUpdate: (update: ChatModelRunResult) => void;
      getAssistantMessageId: () => string | undefined;
    },
  ): Promise<void> {
    const assistantId = ctx.ensureAssistant();
    const currentId = () => ctx.getAssistantMessageId() ?? assistantId;
    const options: ChatModelRunOptions = {
      messages: ctx.historicalMessages,
      runConfig: ctx.runConfig,
      abortSignal: ctx.abortSignal,
      context: this.runtime?.thread.getModelContext() ?? {},
      unstable_assistantMessageId: assistantId,
      unstable_threadId: ctx.threadId,
      unstable_parentId: ctx.parentId,
      unstable_getMessage: () => {
        const message = this.messages.find((m) => m.id === currentId());
        if (!message) {
          throw new Error(
            "[agui] resume stream requested the assistant message before it existed",
          );
        }
        return message;
      },
    };

    try {
      for await (const result of stream(options)) {
        if (ctx.abortSignal.aborted) return;
        ctx.applyUpdate(result);
      }
    } catch (error) {
      if (ctx.abortSignal.aborted) return;
      const err = error instanceof Error ? error : new Error(String(error));
      ctx.applyUpdate({
        status: { type: "incomplete", reason: "error", error: err.message },
      });
      this.onError?.(err);
      this.pendingError = this.pendingError ?? err;
      return;
    }

    if (ctx.abortSignal.aborted) return;
    const current = this.messages.find((m) => m.id === currentId());
    if (!current || current.status?.type === "running") {
      ctx.applyUpdate({ status: { type: "complete", reason: "unknown" } });
    }
  }

  private buildRunInput(
    runId: string,
    runConfig: RunConfig | undefined,
    historyMessages: readonly ThreadMessage[] | undefined,
    resume?: AgUiResumeEntry[],
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
      ...(resume !== undefined ? { resume } : {}),
    };
  }

  private installResumeShim(): void {
    const agent = this.agent as any;
    if (agent[symbolResumeShim]) return;
    agent[symbolResumeShim] = true;
    const onInstance = Object.hasOwn(agent, "prepareRunAgentInput");
    const original = onInstance
      ? agent.prepareRunAgentInput
      : Object.getPrototypeOf(agent)?.prepareRunAgentInput;
    if (typeof original !== "function") return;
    agent.prepareRunAgentInput = function (
      this: unknown,
      params: { resume?: unknown } | undefined,
    ) {
      const input = original.call(this, params);
      if (params?.resume !== undefined && input && typeof input === "object") {
        return { ...(input as object), resume: params.resume };
      }
      return input;
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
    const id = generateOptimisticId();
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
        isOptimistic: true,
        custom: {},
      },
    };
    this.messages = [...this.messages, assistant];
    this.notifyUpdate();
    return id;
  }

  private reassignAssistantId(oldId: string, newId: string): void {
    if (oldId === newId) return;

    const collidesWithExisting = this.messages.some((m) => m.id === newId);

    if (collidesWithExisting) {
      this.logger.debug?.(
        "[agui] reassignAssistantId: server id already present in messages, dropping placeholder",
        { oldId, newId },
      );
      this.messages = this.messages.filter((m) => m.id !== oldId);
    } else {
      this.messages = this.messages.map((m) => {
        if (m.id !== oldId) return m;
        const { isOptimistic: _, ...metadata } = m.metadata;
        return { ...m, id: newId, metadata } as ThreadMessage;
      });
    }

    const pendingParent = this.assistantHistoryParents.get(oldId);
    if (pendingParent !== undefined) {
      this.assistantHistoryParents.delete(oldId);
      if (!this.assistantHistoryParents.has(newId)) {
        this.assistantHistoryParents.set(newId, pendingParent);
      }
    }

    if (this.recordedHistoryIds.has(oldId)) {
      this.recordedHistoryIds.delete(oldId);
      this.recordedHistoryIds.add(newId);
    }

    this.notifyUpdate();
  }

  private updateAssistantMessage(
    messageId: string,
    update: ChatModelRunResult,
  ): string {
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
      const content =
        update.content !== undefined
          ? this.preserveToolResults(
              assistant.content,
              update.content as ThreadAssistantMessage["content"],
            )
          : assistant.content;
      return {
        ...assistant,
        content,
        status: latestStatus,
        metadata,
      };
    });
    if (!touched) return messageId;

    let resolvedMessageId = messageId;
    const isSettled =
      latestStatus !== undefined && latestStatus.type !== "running";
    if (isSettled && isOptimisticId(messageId)) {
      const stableId = generateId();
      this.reassignAssistantId(messageId, stableId);
      resolvedMessageId = stableId;
    } else {
      this.notifyUpdate();
    }
    if (this.isPersistableStatus(latestStatus)) {
      this.persistAssistantHistory(resolvedMessageId);
    }
    this.maybeResumeAfterToolResults(resolvedMessageId);
    return resolvedMessageId;
  }

  // The RunAggregator rebuilds the assistant content from stream events only,
  // so a fresh snapshot omits results injected via addToolResult (frontend tool
  // execution). Carry those results forward so the aggregator never clobbers
  // them. Results are only ever added in this flow, so preserving is safe.
  private preserveToolResults(
    previous: ThreadAssistantMessage["content"],
    next: ThreadAssistantMessage["content"],
  ): ThreadAssistantMessage["content"] {
    const resolved = new Map<string, ToolCallMessagePart>();
    for (const part of previous) {
      if (
        part.type === "tool-call" &&
        "result" in part &&
        part.result !== undefined
      ) {
        resolved.set(part.toolCallId, part);
      }
    }
    if (resolved.size === 0) return next;

    let changed = false;
    const merged = next.map((part) => {
      if (part.type !== "tool-call") return part;
      if ("result" in part && part.result !== undefined) return part;
      const prior = resolved.get(part.toolCallId);
      if (!prior) return part;
      changed = true;
      return {
        ...part,
        result: prior.result,
        ...(prior.artifact !== undefined ? { artifact: prior.artifact } : {}),
        ...(prior.isError !== undefined ? { isError: prior.isError } : {}),
      };
    });
    return changed ? (merged as ThreadAssistantMessage["content"]) : next;
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
      ...(current.isOptimistic ? { isOptimistic: true } : {}),
      ...(incoming.timing ? { timing: incoming.timing } : {}),
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
        if (event.delta.length === 0) return;
        try {
          const state = this.stateSnapshot ?? {};
          const result = jsonpatch.applyPatch(
            state,
            event.delta as Operation[],
            /* validateOperation */ true,
            /* mutateDocument */ false,
          );
          this.stateSnapshot = result.newDocument as ReadonlyJSONValue;
          this.notifyUpdate();
        } catch (error) {
          this.logger.error?.("[agui] failed to apply state delta", error);
        }
        return;
      }
      case "MESSAGES_SNAPSHOT": {
        this.importMessagesSnapshot(event.messages);
        return;
      }
      case "TOOL_CALL_RESULT": {
        if (!aggregator.hasToolCall(event.toolCallId)) {
          const messageId = this.findMessageIdForToolCall(event.toolCallId);
          if (messageId !== undefined) {
            this.applyCrossRunToolResult(messageId, event);
            return;
          }
        }
        aggregator.handle(event);
        return;
      }
      default:
        aggregator.handle(event);
    }
  }

  private applyCrossRunToolResult(
    messageId: string,
    event: Extract<AgUiEvent, { type: "TOOL_CALL_RESULT" }>,
  ): void {
    let updated = false;
    this.messages = this.messages.map((message) => {
      if (message.id !== messageId || message.role !== "assistant")
        return message;
      const assistant = message as ThreadAssistantMessage;
      let matchedToolCall = false;
      const content = assistant.content.map((part) => {
        if (part.type !== "tool-call" || part.toolCallId !== event.toolCallId)
          return part;
        matchedToolCall = true;
        return {
          ...part,
          result: tryParseJSON(event.content ?? "") as ReadonlyJSONValue,
          ...(event.role === "tool" ? { isError: false } : {}),
          ...(event.messageId
            ? { unstable_toolMessageId: event.messageId }
            : {}),
        };
      });
      if (!matchedToolCall) return message;
      updated = true;
      return { ...assistant, content };
    });

    if (!updated) return;
    this.notifyUpdate();
    // Not maybeResumeAfterToolResults: the delivering run is already in
    // flight, and a resume from the owner would reset the head past it.
    this.maybeCompleteAfterToolResults(messageId);
  }

  private importMessagesSnapshot(rawMessages: readonly unknown[]) {
    try {
      const normalized = fromAgUiMessages(rawMessages, {
        showThinking: this.showThinking,
      });
      const converted: ThreadMessage[] = [];
      for (const message of normalized) {
        try {
          converted.push(
            fromThreadMessageLike(message, generateId(), FALLBACK_USER_STATUS),
          );
        } catch (error) {
          this.logger.error?.(
            "[agui] failed to import message from snapshot",
            error,
          );
        }
      }
      this.applyExternalMessages(converted);
    } catch (error) {
      this.logger.error?.("[agui] failed to import messages snapshot", error);
    }
  }

  private toThreadMessage(message: AppendMessage): ThreadMessage {
    return fromThreadMessageLike(
      message as any,
      generateId(),
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

  private isPersistableStatus(status?: MessageStatus): boolean {
    if (this.isTerminalStatus(status)) return true;
    return status?.type === "requires-action" && status.reason === "interrupt";
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
    if (!this.isPersistableStatus(message.status)) return;
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

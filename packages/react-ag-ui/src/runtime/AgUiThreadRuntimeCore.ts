"use client";

import { generateId, fromThreadMessageLike } from "@assistant-ui/core";
import type {
  AddToolResultOptions,
  AppendMessage,
  CreateAppendMessage,
  AssistantRuntime,
  ChatModelRunOptions,
  ChatModelRunResult,
  ExportedMessageRepository,
  MessageStatus,
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
  ThreadMessage,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import { MessageRepository } from "@assistant-ui/core/internal";
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

const isResolvedToolCall = (
  part: ThreadAssistantMessage["content"][number],
): boolean =>
  part.type === "tool-call" && "result" in part && part.result !== undefined;

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
  autoCancelPendingToolCalls?: boolean | undefined;
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
  private autoCancelPendingToolCalls: boolean | undefined;
  private onError: ((error: Error) => void) | undefined;
  private onCancel: (() => void) | undefined;
  private readonly notifyUpdate: () => void;

  private runtime: AssistantRuntime | undefined;
  private readonly repository = new MessageRepository();
  private exportedRepository: ExportedMessageRepository | undefined;
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
    this.autoCancelPendingToolCalls = options.autoCancelPendingToolCalls;
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
    this.autoCancelPendingToolCalls = options.autoCancelPendingToolCalls;
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
    return this.repository.getMessages();
  }

  getMessageRepository(): ExportedMessageRepository {
    if (this.exportedRepository) return this.exportedRepository;

    const exportedRepository = this.repository.export();
    let parentId: string | null = null;
    for (const message of this.repository.getMessages()) {
      if (message.metadata.isOptimistic) {
        exportedRepository.messages.push({ parentId, message });
      }
      parentId = message.id;
    }

    this.exportedRepository = {
      ...exportedRepository,
      headId: this.repository.headId,
    };
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

  private deleteMessage(
    messageId: string,
    replacementId?: string | null,
  ): void {
    this.repository.deleteMessage(messageId, replacementId);
    this.exportedRepository = undefined;
  }

  private tryDeleteMessage(messageId: string): boolean {
    if (!this.hasMessage(messageId)) return false;
    this.deleteMessage(messageId);
    return true;
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

        this.applyExternalMessageRepository(repo);

        if (repo.state !== undefined) {
          this.loadExternalState(repo.state);
        }

        if (repo.unstable_resume) {
          const parentId = repo.headId ?? this.repository.headId;
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
    if (startRun) {
      this.assertNoPendingInterrupts();
      this.maybeAutoCancelPendingToolCalls();
    }
    const threadMessageId = this.appendEntry(message);
    if (!startRun) return;
    await this.startRun(threadMessageId, message.runConfig);
  }

  private maybeAutoCancelPendingToolCalls(): void {
    if (this.autoCancelPendingToolCalls === false) return;
    const pending = this.getPendingToolCalls();
    if (!pending) return;
    this.cancelUnresolvedToolCalls(pending.messageId);
    this.maybeCompleteAfterToolResults(pending.messageId);
  }

  private appendEntry(message: AppendMessage): string {
    if (message.sourceId) this.tryDeleteMessage(message.sourceId);

    const threadMessage = this.toThreadMessage(message);
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
    this.maybeAutoCancelPendingToolCalls();
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

  private findRequiresActionAssistant(
    reason: "interrupt" | "tool-calls",
  ): ThreadAssistantMessage | null {
    const assistant = this.getMessages().findLast(
      (message) => message.role === "assistant",
    ) as ThreadAssistantMessage | undefined;
    if (
      !assistant ||
      assistant.status?.type !== "requires-action" ||
      assistant.status.reason !== reason
    ) {
      return null;
    }
    return assistant;
  }

  getPendingInterrupts(): {
    messageId: string;
    interrupts: readonly AgUiInterrupt[];
  } | null {
    const assistant = this.findRequiresActionAssistant("interrupt");
    if (!assistant) return null;
    const stored = (
      assistant.metadata.custom[AG_UI_METADATA_NAMESPACE] as
        | AgUiCustomMetadata
        | undefined
    )?.interrupts;
    if (!stored?.length) return null;
    return { messageId: assistant.id, interrupts: stored };
  }

  getPendingToolCalls(): {
    messageId: string;
    toolCallIds: string[];
  } | null {
    const assistant = this.findRequiresActionAssistant("tool-calls");
    if (!assistant) return null;
    const toolCallIds: string[] = [];
    for (const part of assistant.content) {
      if (part.type !== "tool-call") continue;
      if (isResolvedToolCall(part)) continue;
      toolCallIds.push(part.toolCallId);
    }
    if (toolCallIds.length === 0) return null;
    return { messageId: assistant.id, toolCallIds };
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

    const resume: AgUiResumeEntry[] = openIds.map((id) =>
      responsesById.get(id)!,
    );

    if (this.isRunningFlag) {
      throw new Error(
        "[agui] submitInterruptResponses: a run is already in progress",
      );
    }

    this.clearPendingInterrupts(pending.messageId);
    await this.startRun(pending.messageId, this.lastRunConfig, resume);
  }

  async steerAway(
    message: CreateAppendMessage,
    responses?: readonly AgUiResumeEntry[],
  ): Promise<void> {
    const pending = this.getPendingInterrupts();
    if (!pending) {
      const pendingTools = this.getPendingToolCalls();
      if (pendingTools) {
        if (responses?.length) {
          throw new Error(
            "[agui] steerAway: responses are only valid for pending interrupts",
          );
        }
        if (this.isRunningFlag) {
          throw new Error("[agui] steerAway: a run is already in progress");
        }
        this.cancelUnresolvedToolCalls(pendingTools.messageId);
        this.maybeCompleteAfterToolResults(pendingTools.messageId);
        const normalized = this.toAppendMessage(message);
        const threadMessageId = this.appendEntry(normalized);
        await this.startRun(threadMessageId, normalized.runConfig);
        return;
      }
      if (responses?.length) {
        throw new Error(
          "[agui] steerAway: no pending interrupts on this thread",
        );
      }
      await this.append(this.toAppendMessage(message));
      return;
    }

    const resume = this.resolveSteerAwayResume(pending.interrupts, responses);

    if (this.isRunningFlag) {
      throw new Error("[agui] steerAway: a run is already in progress");
    }

    const normalized = this.toAppendMessage(message);
    this.clearPendingInterrupts(pending.messageId);
    const threadMessageId = this.appendEntry(normalized);
    await this.startRun(threadMessageId, normalized.runConfig, resume);
  }

  private resolveSteerAwayResume(
    interrupts: readonly AgUiInterrupt[],
    responses: readonly AgUiResumeEntry[] | undefined,
  ): AgUiResumeEntry[] {
    const openIds = interrupts.map((interrupt) => interrupt.id);
    const known = new Set(openIds);
    const responsesById = new Map<string, AgUiResumeEntry>();
    for (const entry of responses ?? []) {
      if (!entry || typeof entry.interruptId !== "string") {
        throw new Error(
          "[agui] steerAway: every response must have an interruptId",
        );
      }
      if (entry.status !== "resolved" && entry.status !== "cancelled") {
        throw new Error(
          `[agui] steerAway: invalid status "${entry.status}" for interrupt ${entry.interruptId}`,
        );
      }
      if (!known.has(entry.interruptId)) {
        throw new Error(
          `[agui] steerAway: unknown interrupt id ${entry.interruptId}`,
        );
      }
      if (responsesById.has(entry.interruptId)) {
        throw new Error(
          `[agui] steerAway: duplicate response for interrupt ${entry.interruptId}`,
        );
      }
      responsesById.set(entry.interruptId, entry);
    }
    return openIds.map(
      (id) => responsesById.get(id) ?? { interruptId: id, status: "cancelled" },
    );
  }

  private toAppendMessage(message: CreateAppendMessage): AppendMessage {
    if (typeof message === "string") {
      return {
        createdAt: new Date(),
        parentId: this.repository.headId,
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
      parentId: message.parentId ?? this.repository.headId,
      sourceId: message.sourceId ?? null,
      role: message.role ?? "user",
      content: message.content,
      attachments: message.attachments ?? [],
      metadata: message.metadata ?? { custom: {} },
      runConfig: message.runConfig ?? {},
      startRun: message.startRun,
    } as AppendMessage;
  }

  private clearPendingInterrupts(messageId: string): void {
    const touched = this.updateMessage(messageId, (message) => {
      if (message.role !== "assistant") return message;
      const assistant = message as ThreadAssistantMessage;
      if (
        assistant.status?.type !== "requires-action" ||
        assistant.status.reason !== "interrupt"
      ) {
        return assistant;
      }
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
    if (touched) {
      this.notifyUpdate();
    }
  }

  findMessageIdForToolCall(toolCallId: string): string | undefined {
    let fallbackMessageId: string | undefined;
    const messages = this.getMessages();
    for (let index = messages.length - 1; index >= 0; index--) {
      const message = messages[index];
      if (!message || message.role !== "assistant") continue;
      for (const part of message.content) {
        if (part.type !== "tool-call" || part.toolCallId !== toolCallId)
          continue;
        if (!isResolvedToolCall(part)) {
          return message.id;
        }
        fallbackMessageId ??= message.id;
      }
    }
    return fallbackMessageId;
  }

  private cancelUnresolvedToolCalls(messageId: string): void {
    const updated = this.updateMessage(messageId, (message) => {
      if (message.role !== "assistant") return message;
      const assistant = message as ThreadAssistantMessage;
      const content = assistant.content.map((part) => {
        if (part.type !== "tool-call" || isResolvedToolCall(part)) return part;
        return {
          ...part,
          result: { error: "Tool call cancelled by user" },
          isError: true,
        };
      });
      return { ...assistant, content };
    });
    if (updated) this.notifyUpdate();
  }

  addToolResult(options: AddToolResultOptions): void {
    const updated = this.updateMessage(options.messageId, (message) => {
      if (message.role !== "assistant") return message;
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
    const message = this.tryGetMessage(messageId)?.message;
    if (!message || message.role !== "assistant") return false;
    const assistant = message as ThreadAssistantMessage;
    if (
      assistant.status?.type !== "requires-action" ||
      assistant.status.reason !== "tool-calls"
    ) {
      return false;
    }
    const allResolved = assistant.content.every(
      (part) => part.type !== "tool-call" || isResolvedToolCall(part),
    );
    if (!allResolved) return false;

    const updated = this.updateMessage(messageId, (current) =>
      current.role === "assistant"
        ? {
            ...(current as ThreadAssistantMessage),
            status: { type: "complete" as const, reason: "unknown" as const },
          }
        : current,
    );
    if (!updated) return false;
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
        expectedParentId = null;
        lastAppliedId = null;
        seen.clear();
        for (const message of messages) {
          if (seen.has(message.id)) continue;
          seen.add(message.id);
          this.addOrUpdateMessage(expectedParentId, message);
          expectedParentId = message.id;
          lastAppliedId = message.id;
        }
      }

      this.resetRepositoryHead(lastAppliedId);
    }

    this.recordedHistoryIds.clear();
    for (const { message } of this.getMessageRepository().messages) {
      this.recordedHistoryIds.add(message.id);
    }
    this.notifyUpdate();
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

    this.assistantHistoryParents.clear();
    this.recordedHistoryIds.clear();
    for (const { message } of loaded.messages) {
      this.recordedHistoryIds.add(message.id);
    }
    this.notifyUpdate();
  }

  loadExternalState(state: ReadonlyJSONValue): void {
    this.stateSnapshot = state;
    this.notifyUpdate();
  }

  setState(
    next:
      | ReadonlyJSONValue
      | ((prev: ReadonlyJSONValue | undefined) => ReadonlyJSONValue),
  ): void {
    this.stateSnapshot =
      typeof next === "function" ? next(this.stateSnapshot) : next;
    this.notifyUpdate();
  }

  resetState(): void {
    this.stateSnapshot = undefined;
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
    const parent = parentId === null ? undefined : this.tryGetMessage(parentId);
    const shouldEagerlyInsertAssistant =
      parentId !== null &&
      parent !== undefined &&
      parentId !== this.repository.headId;
    const historicalMessages = [
      ...(shouldEagerlyInsertAssistant
        ? (this.tryGetMessages(parentId) ?? this.repository.getMessages())
        : this.repository.getMessages()),
    ];

    this.pendingError = null;
    const assistantParentId = parent ? parentId : this.repository.headId;
    let assistantMessageId: string | undefined;
    const ensureAssistant = () => {
      if (assistantMessageId) return assistantMessageId;
      const created = this.insertAssistantPlaceholder(
        assistantParentId ?? null,
      );
      assistantMessageId = created;
      this.markPendingAssistantHistory(created, assistantParentId ?? null);
      return created;
    };

    if (shouldEagerlyInsertAssistant) ensureAssistant();

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
        if (this.reassignAssistantId(placeholder, serverId)) {
          assistantMessageId = serverId;
        }
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
        const message = this.tryGetMessage(currentId())?.message;
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
    const current = this.tryGetMessage(currentId())?.message;
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
    const messages = toAgUiMessages(
      historyMessages ?? this.repository.getMessages(),
    );
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

  private insertAssistantPlaceholder(parentId: string | null): string {
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
    this.addOrUpdateMessage(parentId ?? this.repository.headId, assistant);
    this.switchToBranch(id);
    this.notifyUpdate();
    return id;
  }

  private reassignAssistantId(oldId: string, newId: string): boolean {
    if (oldId === newId) return true;
    const oldItem = this.tryGetMessage(oldId);
    if (!oldItem) return false;

    const collidesWithExisting = this.hasMessage(newId);

    if (collidesWithExisting) {
      this.logger.debug?.(
        "[agui] reassignAssistantId: server id already present in messages or repository, dropping placeholder",
        { oldId, newId },
      );
      this.deleteMessage(oldId, oldItem.parentId ?? null);
    } else {
      const { isOptimistic: _, ...metadata } = oldItem.message.metadata;
      this.addOrUpdateMessage(oldItem.parentId, {
        ...oldItem.message,
        id: newId,
        metadata,
      } as ThreadMessage);
      this.switchToBranch(newId);
      this.tryDeleteMessage(oldId);
    }

    const pendingParent = this.assistantHistoryParents.get(oldId);
    if (pendingParent !== undefined) {
      this.assistantHistoryParents.delete(oldId);
      if (!collidesWithExisting && !this.assistantHistoryParents.has(newId)) {
        this.assistantHistoryParents.set(newId, pendingParent);
      }
    }

    if (this.recordedHistoryIds.has(oldId)) {
      this.recordedHistoryIds.delete(oldId);
      if (!collidesWithExisting) {
        this.recordedHistoryIds.add(newId);
      }
    }

    this.notifyUpdate();
    return !collidesWithExisting;
  }

  private updateAssistantMessage(
    messageId: string,
    update: ChatModelRunResult,
  ): string {
    let latestStatus: MessageStatus | undefined;
    const touched = this.updateMessage(messageId, (message) => {
      if (message.role !== "assistant") return message;
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
      if (part.type === "tool-call" && isResolvedToolCall(part)) {
        resolved.set(part.toolCallId, part);
      }
    }
    if (resolved.size === 0) return next;

    let changed = false;
    const merged = next.map((part) => {
      if (part.type !== "tool-call" || isResolvedToolCall(part)) return part;
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
    const updated = this.updateMessage(messageId, (message) => {
      if (message.role !== "assistant") return message;
      const assistant = message as ThreadAssistantMessage;
      let matchedToolCall = false;
      const content = assistant.content.map((part) => {
        if (part.type !== "tool-call" || part.toolCallId !== event.toolCallId)
          return part;
        matchedToolCall = true;
        return {
          ...part,
          result: (event.mcpResult ??
            tryParseJSON(event.content ?? "")) as ReadonlyJSONValue,
          ...(event.mcpResult !== undefined
            ? { modelContent: [{ type: "text" as const, text: event.content }] }
            : {}),
          ...(typeof event.mcpResult?.isError === "boolean"
            ? { isError: event.mcpResult.isError }
            : event.role === "tool"
              ? { isError: false }
              : {}),
          ...(event.messageId
            ? { unstable_toolMessageId: event.messageId }
            : {}),
        };
      });
      if (!matchedToolCall) return message;
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
    const message = this.tryGetMessage(messageId)?.message;
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

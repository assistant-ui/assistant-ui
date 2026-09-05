"use client";

import {
  generateId,
  fromThreadMessageLike,
  isMcpAppUri,
} from "@assistant-ui/core";
import type {
  AddToolResultOptions,
  AppendMessage,
  CreateAppendMessage,
  AssistantRuntime,
  ChatModelRunOptions,
  ChatModelRunResult,
  ExportedMessageRepository,
  MessageStatus,
  RespondToToolApprovalOptions,
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
  ThreadMessage,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import {
  createMessageRepositorySession,
  invokeUserCallback,
  iterateToolCallParts,
  mapToolCallPartsDeep,
} from "@assistant-ui/core/internal";
import type {
  AbstractAgent,
  AgentSubscriber,
  RunAgentParameters,
  RunAgentResult,
} from "@ag-ui/client";
import jsonpatch, { type Operation } from "fast-json-patch";
import type { Logger } from "./logger";
import { readMcpAppResourceUri } from "./mcp-tool-result";
import type { AgUiEvent, AgUiInterrupt, AgUiResumeEntry } from "./types";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import {
  AG_UI_METADATA_NAMESPACE,
  type AgUiCustomMetadata,
  isPlainObject,
  MCP_APPS_ACTIVITY_TYPE,
  RunAggregator,
  tryParseJSON,
} from "./adapter/run-aggregator";
import {
  fromAgUiMessages,
  toAgUiMessages,
  toAgUiTools,
} from "./adapter/conversions";
import { createAgUiSubscriber } from "./adapter/subscriber";
import {
  buildToolApprovalResume,
  projectAgUiToolApprovals,
  withSettledToolApprovals,
  withToolApprovalDecision,
} from "./adapter/tool-approval";

// AbstractAgent.runAgent declares two parameters. HttpAgent ignores a third and
// is cancelled through agent.abortRun(); the run options stay for subclasses
// that inherit the base no-op abortRun and have no other cancellation hook.
type RunAgentWithRunOptions = (
  parameters: RunAgentParameters,
  subscriber: AgentSubscriber,
  options: { signal: AbortSignal },
) => Promise<RunAgentResult>;

const optimisticPrefix = "__optimistic__";
const generateOptimisticId = () => `${optimisticPrefix}${generateId()}`;
const isOptimisticId = (id: string) => id.startsWith(optimisticPrefix);

const isResolvedToolCall = (
  part: ThreadAssistantMessage["content"][number],
): boolean =>
  part.type === "tool-call" && "result" in part && part.result !== undefined;

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

type AgUiRuntimeCallbackName = "onError" | "onCancel";

const invokeRuntimeCallback = <TArgs extends readonly unknown[]>(
  name: AgUiRuntimeCallbackName,
  callback: ((...args: TArgs) => unknown) | undefined,
  ...args: TArgs
): void => {
  void invokeUserCallback("react-ag-ui", name, callback, ...args);
};

// The aggregator sends only the agui keys it owns (interrupts and
// opaqueReasoning, each as a full replacement), so a shallow spread at the
// custom level would drop any sibling agui state a snapshot import attached.
const mergeAgUiNamespace = (
  current: Record<string, unknown> | undefined,
  incoming: Record<string, unknown>,
) => {
  const merged = { ...current, ...incoming };
  const currentNs = current?.[AG_UI_METADATA_NAMESPACE];
  const incomingNs = incoming[AG_UI_METADATA_NAMESPACE];
  if (
    typeof currentNs === "object" &&
    currentNs !== null &&
    typeof incomingNs === "object" &&
    incomingNs !== null
  ) {
    merged[AG_UI_METADATA_NAMESPACE] = { ...currentNs, ...incomingNs };
  }
  return merged;
};

export class AgUiThreadRuntimeCore {
  private agent: AbstractAgent;
  private logger: Logger;
  private showThinking: boolean;
  private autoCancelPendingToolCalls: boolean | undefined;
  private onError: ((error: Error) => void) | undefined;
  private onCancel: (() => void) | undefined;
  private readonly notifyUpdate: () => void;
  private readonly reportedErrors = new WeakSet<object>();

  private runtime: AssistantRuntime | undefined;
  private readonly session = createMessageRepositorySession({
    decorateExport: (exported, repository) => {
      let parentId: string | null = null;
      for (const message of repository.getMessages()) {
        if (message.metadata.isOptimistic) {
          exported.messages.push({ parentId, message });
        }
        parentId = message.id;
      }

      return {
        ...exported,
        headId: repository.headId,
      };
    },
  });
  private isRunningFlag = false;
  private abortController: AbortController | null = null;
  // The agent that started the active run. updateOptions can swap this.agent
  // mid-run, and cancelling has to reach the agent holding the live request.
  private activeRunAgent: AbstractAgent | null = null;
  private stateSnapshot: ReadonlyJSONValue | undefined;
  private history: ThreadHistoryAdapter | undefined;
  private lastRunConfig: RunConfig | undefined;
  private readonly assistantHistoryParents = new Map<string, string | null>();
  private readonly snapshotHistoryIds = new Set<string>();
  private readonly persistedHistoryIds = new Set<string>();
  private readonly historyWrites = new Map<string, Promise<void>>();
  private _isLoading = false;
  private _loadPromise: Promise<void> | undefined;
  private _loadRequested = false;
  private pendingResumeMessageId: string | null = null;
  private pendingA2uiResume = false;
  private pendingA2uiAction: Record<string, unknown> | undefined;

  constructor(options: CoreOptions) {
    this.agent = options.agent;
    this.logger = options.logger;
    this.showThinking = options.showThinking;
    this.autoCancelPendingToolCalls = options.autoCancelPendingToolCalls;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
    this.history = options.history;
    this.notifyUpdate = options.notifyUpdate;
  }

  updateOptions(options: Omit<CoreOptions, "notifyUpdate">) {
    this.agent = options.agent;
    this.logger = options.logger;
    this.showThinking = options.showThinking;
    this.autoCancelPendingToolCalls = options.autoCancelPendingToolCalls;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
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

  attachRuntime(runtime: AssistantRuntime) {
    this.runtime = runtime;
  }

  detachRuntime() {
    this.runtime = undefined;
    void this.cancel().catch((error) => {
      this.logger.error("[agui] failed to cancel run during teardown", error);
    });
  }

  getMessages(): readonly ThreadMessage[] {
    return this.session.getMessages();
  }

  getMessageRepository(): ExportedMessageRepository {
    return this.session.export();
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
    this._loadRequested = true;
    if (this._loadPromise) return this._loadPromise;
    if (!this.history) return Promise.resolve();

    const promise = this.history.load();

    this._isLoading = true;

    this._loadPromise = promise
      .then(async (repo) => {
        if (!repo) return;

        this.session.applyExternalMessageRepository(repo);
        this.assistantHistoryParents.clear();
        this.snapshotHistoryIds.clear();
        this.persistedHistoryIds.clear();
        for (const { message } of repo.messages) {
          this.persistedHistoryIds.add(message.id);
        }
        this.notifyUpdate();

        if (repo.state !== undefined) {
          this.loadExternalState(repo.state);
        }

        if (repo.unstable_resume) {
          const parentId = repo.headId ?? this.session.headId;
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
    if (message.sourceId) this.session.tryDeleteMessage(message.sourceId);

    const threadMessage = this.toThreadMessage(message);
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
    // Before the local abort, whose listener runs onCancel synchronously: a
    // callback that starts another run replaces the agent's controller, and
    // aborting afterwards would kill that replacement and leave this run live.
    // The local abort is unconditional because abortRun is a user subclass's
    // code, and a throw there would otherwise strand the thread as running.
    try {
      (this.activeRunAgent ?? this.agent).abortRun();
    } finally {
      this.abortController.abort();
    }
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
      invokeRuntimeCallback("onError", this.onError, error);
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
    for (const part of iterateToolCallParts(assistant.content)) {
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

    const responsesById = this.collectInterruptResponses(
      "submitInterruptResponses",
      pending.interrupts,
      responses,
    );

    const openIds = pending.interrupts.map((i) => i.id);
    const missing = openIds.filter((id) => !responsesById.has(id));
    if (missing.length > 0) {
      throw new Error(
        `[agui] submitInterruptResponses: missing responses for open interrupts: ${missing.join(", ")}`,
      );
    }

    this.assertInterruptsAnswerable(
      "submitInterruptResponses",
      pending.interrupts,
    );

    await this.resumeWithResponses(
      pending.messageId,
      openIds.map((id) => responsesById.get(id)!),
    );
  }

  /**
   * Resumes with an already validated resume array. Answerability is checked
   * once per submission: re-checking here would let a clock crossing reject a
   * decision this runtime has already recorded, stranding the gate decided and
   * unretryable.
   */
  private async resumeWithResponses(
    messageId: string,
    resume: AgUiResumeEntry[],
  ): Promise<void> {
    this.clearPendingInterrupts(messageId, resume);
    await this.startRun(messageId, this.lastRunConfig, resume);
  }

  /**
   * A rejected decision reaches the caller through the approval seam, and
   * `onError` in addition, because a consumer watching only the runtime would
   * otherwise miss it. A failure raised by the resumed run itself was already
   * reported by `startRun` before it rethrew, so reporting it here again would
   * give the consumer two notifications for one failure.
   */
  reportError(error: unknown): void {
    if (this.reportedErrors.has(error as object)) {
      this.reportedErrors.delete(error as object);
      return;
    }
    invokeRuntimeCallback(
      "onError",
      this.onError,
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  private assertInterruptsAnswerable(
    method: "submitInterruptResponses" | "respondToToolApproval",
    interrupts: readonly AgUiInterrupt[],
  ): void {
    const now = Date.now();
    for (const interrupt of interrupts) {
      if (!interrupt.expiresAt) continue;
      const expiry = new Date(interrupt.expiresAt).getTime();
      if (Number.isNaN(expiry)) {
        throw new Error(
          `[agui] ${method}: interrupt ${interrupt.id} has malformed expiresAt "${interrupt.expiresAt}"`,
        );
      }
      if (expiry <= now) {
        throw new Error(
          `[agui] ${method}: interrupt ${interrupt.id} expired at ${interrupt.expiresAt}`,
        );
      }
    }
    if (this.isRunningFlag) {
      throw new Error(`[agui] ${method}: a run is already in progress`);
    }
  }

  async respondToToolApproval(
    options: RespondToToolApprovalOptions,
  ): Promise<void> {
    const pending = this.getPendingInterrupts();
    if (!pending) {
      throw new Error(
        "[agui] respondToToolApproval: no pending interrupts on this thread",
      );
    }

    // Bound against the message the gates landed on, so this check claims a
    // batch only where the projection did.
    const gatedMessage = this.session.tryGetMessage(pending.messageId)
      ?.message as ThreadAssistantMessage | undefined;
    const gated = projectAgUiToolApprovals(
      pending.interrupts,
      new Set(
        Array.from(iterateToolCallParts(gatedMessage?.content ?? [])).map(
          (part) => part.toolCallId,
        ),
      ),
    );
    const isGated = [...gated.values()].some(
      (approval) => approval.id === options.approvalId,
    );
    if (!isGated) {
      throw new Error(
        `[agui] respondToToolApproval: no pending tool-call interrupt for approval id "${options.approvalId}"`,
      );
    }

    // The decision is recorded only once the batch is known to be answerable:
    // a rejected submission would otherwise leave the gate decided and
    // unretryable, because a second click reports it as already decided.
    this.assertInterruptsAnswerable(
      "respondToToolApproval",
      pending.interrupts,
    );

    const recorded = this.session.updateMessage(
      pending.messageId,
      (message) => {
        if (message.role !== "assistant") return message;
        const assistant = message as ThreadAssistantMessage;
        const content = withToolApprovalDecision(assistant.content, options);
        if (content === assistant.content) return assistant;
        return { ...assistant, content };
      },
    );
    if (!recorded) {
      throw new Error(
        `[agui] respondToToolApproval: approval "${options.approvalId}" is already decided`,
      );
    }
    this.notifyUpdate();

    const assistant = this.session.tryGetMessage(pending.messageId)?.message as
      | ThreadAssistantMessage
      | undefined;
    if (!assistant) return;

    // AG-UI resumes a run with one response per open interrupt, so the run
    // stays paused until every gate in the batch has been answered.
    const resume = buildToolApprovalResume(
      assistant.content,
      pending.interrupts,
    );
    if (!resume) return;

    await this.resumeWithResponses(pending.messageId, resume);
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
    this.clearPendingInterrupts(pending.messageId, resume);
    const threadMessageId = this.appendEntry(normalized);
    await this.startRun(threadMessageId, normalized.runConfig, resume);
  }

  private resolveSteerAwayResume(
    interrupts: readonly AgUiInterrupt[],
    responses: readonly AgUiResumeEntry[] | undefined,
  ): AgUiResumeEntry[] {
    const responsesById = this.collectInterruptResponses(
      "steerAway",
      interrupts,
      responses ?? [],
    );
    return interrupts.map(
      (interrupt) =>
        responsesById.get(interrupt.id) ?? {
          interruptId: interrupt.id,
          status: "cancelled",
        },
    );
  }

  private collectInterruptResponses(
    method: "submitInterruptResponses" | "steerAway",
    interrupts: readonly AgUiInterrupt[],
    responses: readonly AgUiResumeEntry[],
  ): Map<string, AgUiResumeEntry> {
    const known = new Set(interrupts.map((interrupt) => interrupt.id));
    const responsesById = new Map<string, AgUiResumeEntry>();
    for (const entry of responses) {
      if (!entry || typeof entry.interruptId !== "string") {
        throw new Error(
          `[agui] ${method}: every entry must have an interruptId`,
        );
      }
      if (entry.status !== "resolved" && entry.status !== "cancelled") {
        throw new Error(
          `[agui] ${method}: invalid status "${entry.status}" for interrupt ${entry.interruptId}`,
        );
      }
      if (!known.has(entry.interruptId)) {
        throw new Error(
          `[agui] ${method}: unknown interrupt id ${entry.interruptId}`,
        );
      }
      if (responsesById.has(entry.interruptId)) {
        throw new Error(
          `[agui] ${method}: duplicate response for interrupt ${entry.interruptId}`,
        );
      }
      responsesById.set(entry.interruptId, entry);
    }
    return responsesById;
  }

  private toAppendMessage(message: CreateAppendMessage): AppendMessage {
    if (typeof message === "string") {
      return {
        createdAt: new Date(),
        parentId: this.session.headId,
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
      parentId: message.parentId ?? this.session.headId,
      sourceId: message.sourceId ?? null,
      role: message.role ?? "user",
      content: message.content,
      attachments: message.attachments ?? [],
      metadata: message.metadata ?? { custom: {} },
      runConfig: message.runConfig ?? {},
      startRun: message.startRun,
    } as AppendMessage;
  }

  private clearPendingInterrupts(
    messageId: string,
    resume: readonly AgUiResumeEntry[],
  ): void {
    const touched = this.session.updateMessage(messageId, (message) => {
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
        content: withSettledToolApprovals(assistant.content, resume),
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
      for (const part of iterateToolCallParts(message.content)) {
        if (part.toolCallId !== toolCallId) continue;
        if (!isResolvedToolCall(part)) {
          return message.id;
        }
        fallbackMessageId ??= message.id;
      }
    }
    return fallbackMessageId;
  }

  private cancelUnresolvedToolCalls(messageId: string): void {
    const updated = this.session.updateMessage(messageId, (message) => {
      if (message.role !== "assistant") return message;
      const assistant = message as ThreadAssistantMessage;
      const { content } = mapToolCallPartsDeep(assistant.content, (part) => {
        if (isResolvedToolCall(part)) return part;
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
    // Core's ToolInvocationTracker resolves a nested call to the nested
    // subagent message's id, which is not a session message; re-anchor on the
    // top-level message that owns the tree so the update can land.
    const sessionMessageId = this.session.tryGetMessage(options.messageId)
      ? options.messageId
      : this.findMessageIdForToolCall(options.toolCallId);
    if (sessionMessageId === undefined) return;
    const updated = this.session.updateMessage(sessionMessageId, (message) => {
      if (message.role !== "assistant") return message;
      const assistant = message as ThreadAssistantMessage;
      let matchedToolCall = false;
      const { content } = mapToolCallPartsDeep(assistant.content, (part) => {
        if (part.toolCallId !== options.toolCallId) return part;
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
    this.maybeResumeAfterToolResults(sessionMessageId);
  }

  sendA2uiAction(action: Record<string, unknown>): void {
    this.assertNoPendingInterrupts();
    this.maybeAutoCancelPendingToolCalls();
    const parentId = this.session.headId;
    if (parentId === null) {
      this.logger.debug(
        "[agui] sendA2uiAction: no messages to resume, dropping action",
      );
      return;
    }

    const userAction = { ...action };
    delete userAction.type;
    if (!("timestamp" in userAction)) {
      userAction.timestamp = new Date().toISOString();
    }
    this.pendingA2uiAction = userAction;

    if (this.isRunningFlag) {
      this.pendingA2uiResume = true;
      return;
    }
    this.startResumeRun(parentId);
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
    const message = this.session.tryGetMessage(messageId)?.message;
    if (!message || message.role !== "assistant") return false;
    const assistant = message as ThreadAssistantMessage;
    if (
      assistant.status?.type !== "requires-action" ||
      assistant.status.reason !== "tool-calls"
    ) {
      return false;
    }
    let allResolved = true;
    for (const part of iterateToolCallParts(assistant.content)) {
      if (!isResolvedToolCall(part)) {
        allResolved = false;
        break;
      }
    }
    if (!allResolved) return false;

    const updated = this.session.updateMessage(messageId, (current) =>
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
      invokeRuntimeCallback(
        "onError",
        this.onError,
        error instanceof Error ? error : new Error(String(error)),
      );
    });
  }

  applyExternalMessages(messages: readonly ThreadMessage[]): void {
    this.pendingA2uiResume = false;
    this.pendingA2uiAction = undefined;
    this.assistantHistoryParents.clear();

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
        expectedParentId = null;
        lastAppliedId = null;
        seen.clear();
        for (const message of messages) {
          if (seen.has(message.id)) continue;
          seen.add(message.id);
          this.session.addOrUpdateMessage(expectedParentId, message);
          expectedParentId = message.id;
          lastAppliedId = message.id;
        }
      }

      this.session.resetHead(lastAppliedId);
    }

    this.snapshotHistoryIds.clear();
    for (const { message } of this.getMessageRepository().messages) {
      this.snapshotHistoryIds.add(message.id);
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
    const parent =
      parentId === null ? undefined : this.session.tryGetMessage(parentId);
    const shouldEagerlyInsertAssistant =
      parentId !== null &&
      parent !== undefined &&
      parentId !== this.session.headId;
    const historicalMessages = [
      ...(shouldEagerlyInsertAssistant
        ? (this.session.tryGetMessages(parentId) ?? this.session.getMessages())
        : this.session.getMessages()),
    ];
    const runStartMessageIds = new Set(
      this.getMessageRepository().messages.map(({ message }) => message.id),
    );

    let pendingError: Error | null = null;
    const assistantParentId = parent ? parentId : this.session.headId;
    let assistantMessageId: string | undefined;
    // A snapshot the preserve gate declines still evicts the in-flight
    // assistant; recreating under the cached id on the next content-bearing
    // emit keeps both the stream and the message identity. Status-only emits,
    // data-only content, and off-branch server-id collisions must not
    // recreate: the snapshot already carries this turn's assistant, so
    // resurrecting for custom-event data would leave a trailing data-only
    // duplicate.
    let assistantCollided = false;
    const ensureAssistant = (allowRecreate = false): string => {
      const cached = assistantMessageId;
      if (cached !== undefined && this.session.tryGetMessage(cached))
        return cached;
      if (cached !== undefined && (assistantCollided || !allowRecreate)) {
        return cached;
      }
      const repositoryHeadId = this.session.headId;
      const shouldUseSelectedParent =
        cached === undefined ||
        (shouldEagerlyInsertAssistant &&
          (repositoryHeadId === null ||
            runStartMessageIds.has(repositoryHeadId)));
      // Branch runs keep their selected parent unless the snapshot advanced to
      // a message introduced during this run.
      const parentId =
        shouldUseSelectedParent &&
        assistantParentId &&
        this.session.hasMessage(assistantParentId)
          ? assistantParentId
          : repositoryHeadId;
      const created = this.insertAssistantPlaceholder(parentId, cached);
      assistantMessageId = created;
      this.markPendingAssistantHistory(created, parentId);
      return created;
    };

    if (shouldEagerlyInsertAssistant) ensureAssistant();

    const applyUpdate = (update: ChatModelRunResult) => {
      const hasStreamContent =
        Array.isArray(update.content) &&
        update.content.some((part) => part.type !== "data");
      const resolved = this.updateAssistantMessage(
        ensureAssistant(hasStreamContent),
        update,
      );
      if (resolved !== assistantMessageId) {
        assistantMessageId = resolved;
      }
    };

    const adoptServerMessageId = (
      serverId: string,
      startNewMessage: boolean,
    ) => {
      if (startNewMessage && assistantMessageId !== undefined) {
        applyUpdate({ status: { type: "complete", reason: "unknown" } });
        const previousId = assistantMessageId;
        assistantMessageId = undefined;
        if (this.session.tryGetMessage(previousId)) {
          const created = this.insertAssistantPlaceholder(previousId);
          assistantMessageId = created;
          this.markPendingAssistantHistory(created, previousId);
        }
      }
      const placeholder = ensureAssistant(true);
      if (placeholder === serverId) return;
      const reassigned = this.reassignAssistantId(placeholder, serverId);
      // A collision drops the placeholder before revealing the existing
      // server message as the current head. Only messages introduced during
      // this run can replace the placeholder; regeneration must not rewrite
      // a previous branch when the server incorrectly reuses its id.
      const adoptsVisibleCollision =
        !reassigned &&
        !runStartMessageIds.has(serverId) &&
        this.session.headId === serverId;
      if (reassigned || adoptsVisibleCollision) {
        assistantMessageId = serverId;
        if (adoptsVisibleCollision) {
          const parentId =
            this.session.tryGetMessage(serverId)?.parentId ?? null;
          this.markPendingAssistantHistory(serverId, parentId);
        }
      } else {
        assistantCollided = true;
      }
    };

    const aggregator = new RunAggregator({
      showThinking: this.showThinking,
      logger: this.logger,
      emit: applyUpdate,
      onServerMessageId: (serverId) => {
        adoptServerMessageId(serverId, false);
      },
      onTextMessageStart: (serverId) => adoptServerMessageId(serverId, true),
    });
    const dispatch = (event: AgUiEvent) =>
      this.handleEvent(aggregator, event, assistantMessageId);

    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    this.abortController = abortController;
    const runAgentInstance = this.agent;
    this.activeRunAgent = runAgentInstance;

    let cancelRun = () => dispatch({ type: "RUN_CANCELLED" });
    abortSignal.addEventListener(
      "abort",
      () => {
        cancelRun();
        this.finishRun(abortController);
        invokeRuntimeCallback("onCancel", this.onCancel);
      },
      { once: true },
    );

    this.setRunning(true);

    try {
      if (resumeStream) {
        // Cancel flips only the status; an aggregator RUN_CANCELLED would emit an empty snapshot and wipe the replayed content.
        cancelRun = () =>
          applyUpdate({ status: { type: "incomplete", reason: "cancelled" } });
        pendingError =
          (await this.consumeResumeStream(resumeStream, {
            runConfig: normalizedRunConfig,
            threadId: this.agent.threadId || "main",
            parentId: assistantParentId,
            historicalMessages,
            abortSignal,
            ensureAssistant,
            applyUpdate,
            getAssistantMessageId: () => assistantMessageId,
          })) ?? null;
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
            if (abortSignal.aborted) return;
            pendingError = error;
            invokeRuntimeCallback("onError", this.onError, error);
          },
        });
        try {
          (runAgentInstance as any).messages = input.messages;
          (runAgentInstance as any).threadId = input.threadId;
          (runAgentInstance as any).state = input.state ?? null;
        } catch {
          // ignore
        }
        const runAgent: RunAgentWithRunOptions =
          runAgentInstance.runAgent.bind(runAgentInstance);
        await runAgent(input, subscriber, { signal: abortSignal });
      }
    } catch (error) {
      if (!abortSignal.aborted) {
        const err = error instanceof Error ? error : new Error(String(error));
        dispatch({ type: "RUN_ERROR", message: err.message });
        invokeRuntimeCallback("onError", this.onError, err);
        pendingError ??= err;
      }
    } finally {
      this.finishRun(abortController);
    }

    if (pendingError) {
      const err = pendingError;
      this.reportedErrors.add(err);
      this.pendingResumeMessageId = null;
      this.pendingA2uiResume = false;
      this.pendingA2uiAction = undefined;
      throw err;
    }

    // A tool result that landed before the run settled deferred its
    // continuation here so a second run never overlaps the first.
    if (this.pendingResumeMessageId !== null) {
      const resumeMessageId = this.pendingResumeMessageId;
      this.pendingResumeMessageId = null;
      if (!abortSignal.aborted) {
        this.startResumeRun(resumeMessageId);
      } else {
        this.pendingA2uiAction = undefined;
      }
    }

    if (this.pendingA2uiResume) {
      this.pendingA2uiResume = false;
      if (!abortSignal.aborted && this.pendingA2uiAction !== undefined) {
        if (this.getPendingInterrupts()) {
          this.pendingA2uiAction = undefined;
          this.logger.debug(
            "[agui] sendA2uiAction: pending interrupts, dropping action",
          );
          return;
        }
        this.maybeAutoCancelPendingToolCalls();
        const parentId = this.session.headId;
        if (parentId !== null) {
          this.startResumeRun(parentId);
        } else {
          this.pendingA2uiAction = undefined;
          this.logger.debug(
            "[agui] sendA2uiAction: no messages to resume, dropping action",
          );
        }
      } else {
        this.pendingA2uiAction = undefined;
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
  ): Promise<Error | undefined> {
    this.pendingA2uiAction = undefined;
    this.pendingA2uiResume = false;
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
        const message = this.session.tryGetMessage(currentId())?.message;
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
        if (ctx.abortSignal.aborted) return undefined;
        ctx.applyUpdate(result);
      }
    } catch (error) {
      if (ctx.abortSignal.aborted) return undefined;
      const err = error instanceof Error ? error : new Error(String(error));
      ctx.applyUpdate({
        status: { type: "incomplete", reason: "error", error: err.message },
      });
      invokeRuntimeCallback("onError", this.onError, err);
      return err;
    }

    if (ctx.abortSignal.aborted) return undefined;
    const current = this.session.tryGetMessage(currentId())?.message;
    if (!current || current.status?.type === "running") {
      ctx.applyUpdate({ status: { type: "complete", reason: "unknown" } });
    }
    return undefined;
  }

  private buildRunInput(
    runId: string,
    runConfig: RunConfig | undefined,
    historyMessages: readonly ThreadMessage[] | undefined,
    resume?: AgUiResumeEntry[],
  ) {
    const threadId = this.agent.threadId || "main";
    const messages = toAgUiMessages(
      historyMessages ?? this.session.getMessages(),
    );
    const context = this.runtime?.thread.getModelContext();
    const input = {
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
        ...(this.pendingA2uiAction
          ? { a2uiAction: { userAction: this.pendingA2uiAction } }
          : {}),
      },
      ...(resume !== undefined ? { resume } : {}),
    };
    this.pendingA2uiAction = undefined;
    return input;
  }

  private setRunning(running: boolean) {
    this.isRunningFlag = running;
    this.notifyUpdate();
  }

  private finishRun(controller: AbortController | null) {
    if (this.abortController !== controller) return;
    this.abortController = null;
    this.activeRunAgent = null;
    this.setRunning(false);
  }

  private insertAssistantPlaceholder(
    parentId: string | null,
    id: string = generateOptimisticId(),
  ): string {
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
        isOptimistic: isOptimisticId(id),
        custom: {},
      },
    };
    this.session.addOrUpdateMessage(parentId ?? this.session.headId, assistant);
    this.session.switchToBranch(id);
    this.notifyUpdate();
    return id;
  }

  private reassignAssistantId(oldId: string, newId: string): boolean {
    if (oldId === newId) return true;
    const oldItem = this.session.tryGetMessage(oldId);
    if (!oldItem) return false;

    const collidesWithExisting = this.session.hasMessage(newId);

    if (collidesWithExisting) {
      this.logger.debug?.(
        "[agui] reassignAssistantId: server id already present in messages or repository, dropping placeholder",
        { oldId, newId },
      );
      this.session.deleteMessage(oldId, oldItem.parentId ?? null);
    } else {
      const { isOptimistic: _, ...metadata } = oldItem.message.metadata;
      this.session.addOrUpdateMessage(oldItem.parentId, {
        ...oldItem.message,
        id: newId,
        metadata,
      } as ThreadMessage);
      this.session.switchToBranch(newId);
      this.session.tryDeleteMessage(oldId);
    }

    const pendingParent = this.assistantHistoryParents.get(oldId);
    if (pendingParent !== undefined) {
      this.assistantHistoryParents.delete(oldId);
      if (!collidesWithExisting && !this.assistantHistoryParents.has(newId)) {
        this.assistantHistoryParents.set(newId, pendingParent);
      }
    }

    for (const ids of [this.snapshotHistoryIds, this.persistedHistoryIds]) {
      if (ids.has(oldId)) {
        ids.delete(oldId);
        if (!collidesWithExisting) {
          ids.add(newId);
        }
      }
    }

    // An in-flight write completes under the id it was started with, so the
    // rename moves the chain entry and transfers the completion mark; without
    // this the resolve records the dead id and the live one appends again.
    const pendingWrite = this.historyWrites.get(oldId);
    if (pendingWrite) {
      this.historyWrites.delete(oldId);
      if (!collidesWithExisting) {
        this.historyWrites.set(newId, pendingWrite);
        const settle = () => {
          if (this.historyWrites.get(newId) === pendingWrite) {
            this.historyWrites.delete(newId);
          }
        };
        void pendingWrite.then(() => {
          this.persistedHistoryIds.delete(oldId);
          this.persistedHistoryIds.add(newId);
          settle();
        }, settle);
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
    const touched = this.session.updateMessage(messageId, (message) => {
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
    for (const part of iterateToolCallParts(previous)) {
      if (isResolvedToolCall(part)) {
        resolved.set(part.toolCallId, part);
      }
    }
    if (resolved.size === 0) return next;

    const { content: merged, changed } = mapToolCallPartsDeep(next, (part) => {
      if (isResolvedToolCall(part)) return part;
      const prior = resolved.get(part.toolCallId);
      if (!prior) return part;
      return {
        ...part,
        result: prior.result,
        ...(prior.artifact !== undefined ? { artifact: prior.artifact } : {}),
        ...(prior.isError !== undefined ? { isError: prior.isError } : {}),
      };
    });
    return changed ? merged : next;
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
        ? mergeAgUiNamespace(current.custom, incoming.custom)
        : current.custom,
    };
  }

  private handleEvent(
    aggregator: RunAggregator,
    event: AgUiEvent,
    activeAssistantId: string | undefined,
  ) {
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
        this.importMessagesSnapshot(event.messages, activeAssistantId);
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
      case "ACTIVITY_SNAPSHOT": {
        const toolCallId = event.content["toolCallId"];
        if (
          event.activityType === MCP_APPS_ACTIVITY_TYPE &&
          typeof toolCallId === "string" &&
          !aggregator.hasToolCall(toolCallId)
        ) {
          const messageId = this.findMessageIdForToolCall(toolCallId);
          if (messageId !== undefined) {
            this.applyCrossRunActivitySnapshot(messageId, toolCallId, event);
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
    const updated = this.session.updateMessage(messageId, (message) => {
      if (message.role !== "assistant") return message;
      const assistant = message as ThreadAssistantMessage;
      const mcpAppUri = readMcpAppResourceUri(event.mcpResult?._meta);
      let matchedToolCall = false;
      const { content } = mapToolCallPartsDeep(assistant.content, (part) => {
        if (part.toolCallId !== event.toolCallId) return part;
        matchedToolCall = true;
        // An applied activity snapshot owns part.result; a later result only
        // fills what is missing, mirroring the aggregator's finishToolCall.
        // The aggregator's flag is set only when the snapshot carried a
        // result, so app presence alone is not enough: the current result
        // must be CallToolResult-shaped (a required content array).
        const snapshotResultApplied =
          part.mcp?.app !== undefined &&
          isPlainObject(part.result) &&
          Array.isArray((part.result as Record<string, unknown>)["content"]);
        if (snapshotResultApplied) {
          return {
            ...part,
            ...(part.modelContent === undefined && event.content
              ? {
                  modelContent: [
                    { type: "text" as const, text: event.content },
                  ],
                }
              : {}),
            ...(part.isError === undefined
              ? typeof event.mcpResult?.isError === "boolean"
                ? { isError: event.mcpResult.isError }
                : event.role === "tool"
                  ? { isError: false }
                  : {}
              : {}),
            ...(event.messageId
              ? { unstable_toolMessageId: event.messageId }
              : {}),
          };
        }
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
          ...(part.mcp === undefined && mcpAppUri !== undefined
            ? { mcp: { app: { resourceUri: mcpAppUri } } }
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

  private applyCrossRunActivitySnapshot(
    messageId: string,
    toolCallId: string,
    event: Extract<AgUiEvent, { type: "ACTIVITY_SNAPSHOT" }>,
  ): void {
    const resourceUri = event.content["resourceUri"];
    if (typeof resourceUri !== "string" || !isMcpAppUri(resourceUri)) return;
    const serverId = event.content["serverId"];
    const serverHash = event.content["serverHash"];
    const appServerId =
      typeof serverId === "string" && serverId.length > 0
        ? serverId
        : typeof serverHash === "string" && serverHash.length > 0
          ? serverHash
          : undefined;
    const result = event.content["result"];
    const updated = this.session.updateMessage(messageId, (message) => {
      if (message.role !== "assistant") return message;
      const assistant = message as ThreadAssistantMessage;
      let matchedToolCall = false;
      const { content } = mapToolCallPartsDeep(assistant.content, (part) => {
        if (part.toolCallId !== toolCallId) return part;
        matchedToolCall = true;
        return {
          ...part,
          mcp: {
            app: {
              resourceUri,
              ...(appServerId ? { serverId: appServerId } : {}),
            },
          },
          ...(isPlainObject(result)
            ? {
                ...(part.result !== undefined && part.modelContent === undefined
                  ? {
                      modelContent: [
                        {
                          type: "text" as const,
                          text:
                            typeof part.result === "string"
                              ? part.result
                              : JSON.stringify(part.result),
                        },
                      ],
                    }
                  : {}),
                result: result as ReadonlyJSONValue,
                isError: result["isError"] === true,
              }
            : {}),
        };
      });
      if (!matchedToolCall) return message;
      return { ...assistant, content };
    });

    if (!updated) return;
    this.notifyUpdate();
    this.maybeCompleteAfterToolResults(messageId);
  }

  private importMessagesSnapshot(
    rawMessages: readonly unknown[],
    activeAssistantId: string | undefined,
  ) {
    try {
      const activeMessage = activeAssistantId
        ? this.session.tryGetMessage(activeAssistantId)?.message
        : undefined;
      const activeAssistant =
        activeMessage?.role === "assistant" ? activeMessage : undefined;
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
      const snapshotContainsActiveAssistant = converted.some(
        (message) => message.id === activeAssistant?.id,
      );
      const preservesActiveAssistant =
        activeAssistant !== undefined &&
        !snapshotContainsActiveAssistant &&
        (activeAssistant.metadata.isOptimistic !== true ||
          converted.at(-1)?.role !== "assistant");
      if (preservesActiveAssistant) {
        converted.push(activeAssistant);
      }
      this.applyExternalMessages(converted);
      if (activeAssistant !== undefined) {
        const activeItem = this.session.tryGetMessage(activeAssistant.id);
        if (activeItem) {
          if (preservesActiveAssistant) {
            this.snapshotHistoryIds.delete(activeAssistant.id);
          }
          this.markPendingAssistantHistory(
            activeAssistant.id,
            activeItem.parentId,
          );
        }
      }
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
    void this.appendHistoryItem(parentId, message)?.catch((error) => {
      this.logger.error?.("[agui] failed to append history entry", error);
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
    const history = this.history;
    if (!history) return;
    const parentId = this.assistantHistoryParents.get(messageId);
    if (parentId === undefined) return;
    const message = this.session.tryGetMessage(messageId)?.message;
    if (!message || message.role !== "assistant") return;
    if (!this.isPersistableStatus(message.status)) return;
    const wasPersisted = this.persistedHistoryIds.has(messageId);
    const update = history.update;
    const shouldUpdate =
      update !== undefined &&
      (wasPersisted || this.snapshotHistoryIds.has(messageId));

    if (shouldUpdate) {
      const write = this.chainHistoryWrite(messageId, () =>
        update.call(history, { parentId, message }),
      );
      this.assistantHistoryParents.delete(messageId);
      void write.then(
        () => {
          this.persistedHistoryIds.add(messageId);
        },
        (error) => {
          const pending = this.historyWrites.get(messageId);
          if (pending === undefined || pending === write) {
            this.assistantHistoryParents.set(messageId, parentId);
          }
          this.logger.error?.("[agui] failed to update history entry", error);
        },
      );
      return;
    }

    if (wasPersisted) {
      this.assistantHistoryParents.delete(messageId);
      return;
    }

    const write = this.appendHistoryItem(parentId, message);
    if (!write) return;
    this.assistantHistoryParents.delete(messageId);
    void write.then(
      () => {},
      (error) => {
        const pending = this.historyWrites.get(messageId);
        if (pending === undefined || pending === write) {
          this.assistantHistoryParents.set(messageId, parentId);
        }
        this.logger.error?.("[agui] failed to append history entry", error);
      },
    );
  }

  private appendHistoryItem(
    parentId: string | null,
    message: ThreadMessage,
  ): Promise<void> | undefined {
    if (!this.history || this.persistedHistoryIds.has(message.id)) return;
    const pending = this.historyWrites.get(message.id);
    if (pending) return pending;

    const append = this.history.append.bind(this.history);
    const write = this.chainHistoryWrite(message.id, () =>
      append({ parentId, message }),
    );
    void write.then(
      () => {
        this.persistedHistoryIds.add(message.id);
      },
      () => {},
    );
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

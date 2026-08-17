"use client";

import { fromThreadMessageLike, generateId } from "@assistant-ui/core";
import type {
  AppendMessage,
  AssistantRuntime,
  ExportedMessageRepository,
  MessageStatus,
  RespondToToolApprovalOptions,
  ThreadAssistantMessage,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/core";
import { MessageRepository } from "@assistant-ui/core/internal";
import type { AcpClient } from "./AcpClient";
import { autoAllowPermissionHandler } from "./AcpClient";
import {
  AcpContentAccumulator,
  permissionOptionToApprovalOption,
  stopReasonToMessageStatus,
  threadContentToAcpBlocks,
} from "./conversions";
import type {
  AcpAvailableCommand,
  AcpExtras,
  AcpPermissionOutcome,
  AcpPermissionRequest,
  AcpPlanEntry,
  AcpSessionUpdate,
} from "./types";

export type AcpPermissionsMode = "ask" | "auto-allow";

export type AcpThreadRuntimeCoreOptions = {
  client: AcpClient;
  permissions?: AcpPermissionsMode;
  autoConnect?: boolean;
  onError?: ((error: Error) => void) | undefined;
  onCancel?: (() => void) | undefined;
  history?: ThreadHistoryAdapter | undefined;
  notifyUpdate: () => void;
};

const FALLBACK_USER_STATUS = {
  type: "complete",
  reason: "unknown",
} as const;

type AcpRuntimeCallbackName = "onError" | "onCancel";

const reportCallbackError = (name: AcpRuntimeCallbackName, error: unknown) => {
  console.error(`[react-acp] ${name} callback threw an error`, error);
};

const invokeRuntimeCallback = <TArgs extends unknown[]>(
  name: AcpRuntimeCallbackName,
  callback: ((...args: TArgs) => void) | undefined,
  ...args: TArgs
) => {
  if (!callback) return;

  try {
    const result = callback(...args) as unknown;
    if (
      result !== null &&
      (typeof result === "object" || typeof result === "function") &&
      "then" in result &&
      typeof result.then === "function"
    ) {
      void Promise.resolve(result).catch((error) => {
        reportCallbackError(name, error);
      });
    }
  } catch (error) {
    reportCallbackError(name, error);
  }
};

type ActiveRun = {
  assistantId: string;
  accumulator: AcpContentAccumulator;
  abortController: AbortController;
};

type PendingPermission = {
  request: AcpPermissionRequest;
  resolve: (outcome: AcpPermissionOutcome) => void;
};

export class AcpThreadRuntimeCore {
  private client: AcpClient;
  private permissions: AcpPermissionsMode;
  private autoConnect: boolean;
  private onError: ((error: Error) => void) | undefined;
  private onCancel: (() => void) | undefined;
  private history: ThreadHistoryAdapter | undefined;
  private readonly notifyUpdate: () => void;

  private runtime: AssistantRuntime | undefined;
  private readonly repository = new MessageRepository();
  private exportedRepository: ExportedMessageRepository | undefined;
  private isRunningFlag = false;
  private abortController: AbortController | null = null;
  private activeRun: ActiveRun | undefined;
  private _isLoading = false;
  private _loadPromise: Promise<void> | undefined;

  // ACP-specific state
  private plan: readonly AcpPlanEntry[] | undefined;
  private sessionTitle: string | undefined;
  private currentModeId: string | undefined;
  private availableCommands: readonly AcpAvailableCommand[] | undefined;
  private permissionCounter = 0;
  private readonly pendingPermissions = new Map<string, PendingPermission>();

  // History tracking
  private readonly assistantHistoryParents = new Map<string, string | null>();
  private readonly recordedHistoryIds = new Set<string>();

  private readonly boundOnSessionUpdate = (
    _sessionId: string,
    update: AcpSessionUpdate,
  ) => this.handleSessionUpdate(update);
  private readonly boundOnConnectionChange = () => this.notifyUpdate();
  private readonly boundPermissionHandler = (request: AcpPermissionRequest) =>
    this.handlePermissionRequest(request);

  constructor(options: AcpThreadRuntimeCoreOptions) {
    this.client = options.client;
    this.permissions = options.permissions ?? "ask";
    this.autoConnect = options.autoConnect ?? true;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
    this.history = options.history;
    this.notifyUpdate = options.notifyUpdate;
    // NOTE: deliberately does NOT touch client callbacks here. Cores are
    // constructed inside useMemo factories, which React may run for render
    // passes it later discards (StrictMode double-invocation, interrupted
    // concurrent renders) — a discarded core must not be able to steal the
    // client's event handlers from the committed one. attachClient() is the
    // single subscription point; call it from an effect.
  }

  /** Subscribe this core to its client's event streams. Idempotent. */
  attachClient(): void {
    this.client.onSessionUpdate = this.boundOnSessionUpdate;
    this.client.onConnectionChange = this.boundOnConnectionChange;
    this.client.permissionHandler = this.boundPermissionHandler;
  }

  /** Inverse of attachClient; only clears callbacks this core still owns. */
  detachClient(): void {
    if (this.client.onSessionUpdate === this.boundOnSessionUpdate)
      this.client.onSessionUpdate = undefined;
    if (this.client.onConnectionChange === this.boundOnConnectionChange)
      this.client.onConnectionChange = undefined;
    if (this.client.permissionHandler === this.boundPermissionHandler)
      this.client.permissionHandler = autoAllowPermissionHandler;
  }

  updateOptions(options: Omit<AcpThreadRuntimeCoreOptions, "notifyUpdate">) {
    this.client = options.client;
    this.permissions = options.permissions ?? "ask";
    this.autoConnect = options.autoConnect ?? true;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
    this.history = options.history;
  }

  attachRuntime(runtime: AssistantRuntime) {
    this.runtime = runtime;
  }

  detachRuntime() {
    this.runtime = undefined;
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

  isRunning(): boolean {
    return this.isRunningFlag;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  getExtras(): AcpExtras {
    return {
      connectionState: this.client.connectionState,
      sessionId: this.client.sessionId,
      agentInfo: this.client.agentInfo,
      agentCapabilities: this.client.agentCapabilities,
      plan: this.plan,
      sessionTitle: this.sessionTitle,
      currentModeId: this.currentModeId,
      availableCommands: this.availableCommands,
    };
  }

  __internal_load(): Promise<void> {
    if (this._loadPromise) return this._loadPromise;

    this._isLoading = true;

    const historyPromise = this.history?.load() ?? Promise.resolve(null);
    const connectPromise = this.autoConnect
      ? this.client.connect().catch((error) => {
          invokeRuntimeCallback(
            "onError",
            this.onError,
            error instanceof Error ? error : new Error(String(error)),
          );
        })
      : Promise.resolve(undefined);

    this._loadPromise = Promise.all([historyPromise, connectPromise])
      .then(([repo]) => {
        if (repo) {
          this.applyExternalMessages(repo.messages.map((m) => m.message));
        }
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

  async reload(parentId: string | null): Promise<void> {
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
    if (!this.abortController) return;

    for (const [, pending] of this.pendingPermissions) {
      pending.resolve({ outcome: "cancelled" });
    }
    this.pendingPermissions.clear();

    this.abortController.abort();
    void this.client.cancel();
  }

  respondToApproval(options: RespondToToolApprovalOptions): void {
    const pending = this.pendingPermissions.get(options.approvalId);
    if (!pending) return;
    this.pendingPermissions.delete(options.approvalId);

    let optionId = options.optionId;
    if (!optionId) {
      const kindPrefix = options.approved ? "allow" : "reject";
      optionId =
        pending.request.options.find((o) => o.kind.startsWith(kindPrefix))
          ?.optionId ?? pending.request.options[0]?.optionId;
    }

    pending.resolve(
      optionId ? { outcome: "selected", optionId } : { outcome: "cancelled" },
    );

    const run = this.activeRun;
    if (run) {
      run.accumulator.resolveApproval(options.approvalId, {
        approved: options.approved,
        ...(options.optionId != null && { optionId: options.optionId }),
      });
      this.updateAssistantContent(run.assistantId, run.accumulator.content);
      this.updateAssistantStatus(run.assistantId, { type: "running" });
      this.notifyUpdate();
    }
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
        let parentId: string | null = null;
        lastAppliedId = null;
        const chainSeen = new Set<string>();
        for (const message of messages) {
          if (chainSeen.has(message.id)) continue;
          chainSeen.add(message.id);
          this.addOrUpdateMessage(parentId, message);
          parentId = message.id;
          lastAppliedId = message.id;
        }
      }

      this.resetRepositoryHead(lastAppliedId);
    }

    this.assistantHistoryParents.clear();
    this.recordedHistoryIds.clear();
    for (const { message } of this.getMessageRepository().messages) {
      this.recordedHistoryIds.add(message.id);
    }
    this.notifyUpdate();
  }

  // --- Session update dispatch ---

  private handleSessionUpdate(update: AcpSessionUpdate): void {
    switch (update.sessionUpdate) {
      case "plan":
        this.plan = update.entries;
        this.notifyUpdate();
        return;
      case "session_info_update":
        if (update.title != null) this.sessionTitle = update.title;
        this.notifyUpdate();
        return;
      case "current_mode_update":
        this.currentModeId = update.currentModeId;
        this.notifyUpdate();
        return;
      case "available_commands_update":
        this.availableCommands = update.availableCommands;
        this.notifyUpdate();
        return;
      case "user_message_chunk":
        return;
    }

    const run = this.activeRun;
    if (!run) return;
    if (run.accumulator.consume(update as any)) {
      this.updateAssistantContent(run.assistantId, run.accumulator.content);
      this.notifyUpdate();
    }
  }

  private handlePermissionRequest(
    request: AcpPermissionRequest,
  ): Promise<AcpPermissionOutcome> {
    const run = this.activeRun;
    if (this.permissions === "auto-allow" || !run) {
      return Promise.resolve(autoAllowPermissionHandler(request));
    }

    const approvalId = `acp-permission-${++this.permissionCounter}`;
    run.accumulator.attachApproval(request.toolCall, {
      id: approvalId,
      options: request.options.map(permissionOptionToApprovalOption),
    });
    this.updateAssistantContent(run.assistantId, run.accumulator.content);
    this.updateAssistantStatus(run.assistantId, {
      type: "requires-action",
      reason: "tool-calls",
    });
    this.notifyUpdate();

    return new Promise<AcpPermissionOutcome>((resolve) => {
      this.pendingPermissions.set(approvalId, { request, resolve });
    });
  }

  // --- Run logic ---

  private async startRun(userThreadMessage: ThreadMessage): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    const blocks = threadContentToAcpBlocks(
      userThreadMessage.role === "user" ? userThreadMessage.content : [],
    );

    const assistantParentId = userThreadMessage.id;
    const assistantId = this.insertAssistantPlaceholder(assistantParentId);
    this.markPendingAssistantHistory(assistantId, assistantParentId);

    const abortController = new AbortController();
    this.abortController = abortController;
    const accumulator = new AcpContentAccumulator();
    this.activeRun = { assistantId, accumulator, abortController };

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
      const stopReason = await this.client.prompt(blocks);
      if (!abortController.signal.aborted) {
        this.updateAssistantStatus(
          assistantId,
          stopReasonToMessageStatus(stopReason),
        );
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.updateAssistantStatus(assistantId, {
          type: "incomplete",
          reason: "error",
          error: err.message,
        });
        invokeRuntimeCallback("onError", this.onError, err);
      }
    } finally {
      this.finishRun(abortController);
      if (this.activeRun?.assistantId === assistantId) {
        this.activeRun = undefined;
      }
    }
  }

  // --- Message helpers ---

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
    if (!this.history || this.recordedHistoryIds.has(message.id)) return;
    this.recordedHistoryIds.add(message.id);
    void this.history.append({ parentId, message }).catch(() => {
      this.recordedHistoryIds.delete(message.id);
    });
  }
}

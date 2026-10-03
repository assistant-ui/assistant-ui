import {
  fromThreadMessageLike,
  generateId,
  type AppendMessage,
  type MessageStatus,
  type RespondToToolApprovalOptions,
  type ThreadHistoryAdapter,
  type ThreadMessage,
  type ThreadMessageLike,
} from "@assistant-ui/core";
import { invokeUserCallback } from "@assistant-ui/core/internal";
import {
  autoAllowPermissionHandler,
  cancelPermissionHandler,
  type AcpClient,
} from "./AcpClient";
import {
  resolvePermissionOutcome,
  stopReasonToMessageStatus,
  threadContentToAcpBlocks,
} from "./conversions";
import { toThreadMessage } from "./acpMessageProjection";
import {
  createAcpThreadState,
  reduceAcpThreadState,
  type AcpAssistantMessage,
  type AcpThreadEvent,
  type AcpThreadMessage,
  type AcpThreadState,
  type AcpUserMessage,
} from "./acpThreadState";
import type {
  AcpConnectionState,
  AcpPermissionOutcome,
  AcpPermissionRequest,
  AcpSessionUpdate,
} from "./types";

export type AcpPermissionsMode = "ask" | "auto-allow";

export type AcpThreadControllerOptions = {
  client: AcpClient;
  permissions?: AcpPermissionsMode | undefined;
  autoConnect?: boolean | undefined;
  onError?: ((error: Error) => void) | undefined;
  onCancel?: (() => void) | undefined;
  history?: ThreadHistoryAdapter | undefined;
};

export type AcpThreadControllerLike = {
  getState(): AcpThreadState;
  subscribe(listener: () => void): () => void;
  attach(): Promise<void>;
  detach(): Promise<void>;
  updateOptions(options: AcpThreadControllerOptions): Promise<void>;
  load(): Promise<void>;
  append(message: AppendMessage): Promise<void>;
  edit(message: AppendMessage): Promise<void>;
  reload(parentId: string | null): Promise<void>;
  cancel(): Promise<void>;
  respondToApproval(options: RespondToToolApprovalOptions): Promise<void>;
  applyExternalMessages(messages: readonly ThreadMessage[]): Promise<void>;
  dispose(): Promise<void>;
};

const FALLBACK_USER_STATUS = { type: "complete", reason: "unknown" } as const;

/** Upper bound on waiting for a cancelled turn's `session/prompt` to settle. */
const SUPERSEDED_PROMPT_TIMEOUT_MS = 5000;

const noop = () => {};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

type PendingPermission = {
  request: AcpPermissionRequest;
  resolve: (outcome: AcpPermissionOutcome) => void;
};

export class AcpThreadController implements AcpThreadControllerLike {
  private state: AcpThreadState;
  private readonly listeners = new Set<() => void>();
  private readonly pendingPermissions = new Map<string, PendingPermission>();
  private readonly recordedHistoryIds = new Set<string>();
  private client: AcpClient;
  private permissionsMode: AcpPermissionsMode;
  private autoConnect: boolean;
  private onError: ((error: Error) => void) | undefined;
  private onCancel: (() => void) | undefined;
  private history: ThreadHistoryAdapter | undefined;
  private loadPromise: Promise<void> | undefined;
  private hasLoaded = false;
  private loadedHistory: ThreadHistoryAdapter | undefined;
  private loadingHistory: ThreadHistoryAdapter | undefined;
  private runToken = 0;
  private permissionCounter = 0;
  private attached = false;
  private inflightPrompt: Promise<unknown> | undefined;

  private readonly boundOnSessionUpdate = (
    _sessionId: string,
    update: AcpSessionUpdate,
  ) => {
    this.dispatch({ type: "session-update", update });
  };

  private readonly boundOnConnectionChange = (
    connectionState: AcpConnectionState,
  ) => {
    this.dispatch(this.connectionEvent(connectionState));
  };

  private readonly boundPermissionHandler = (request: AcpPermissionRequest) =>
    this.handlePermissionRequest(request);

  constructor(options: AcpThreadControllerOptions) {
    this.client = options.client;
    this.permissionsMode = options.permissions ?? "ask";
    this.autoConnect = options.autoConnect ?? true;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
    this.history = options.history;
    this.state = createAcpThreadState();
  }

  getState = (): AcpThreadState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  async attach(): Promise<void> {
    if (this.attached) return;
    this.attached = true;
    this.client.onSessionUpdate = this.boundOnSessionUpdate;
    this.client.onConnectionChange = this.boundOnConnectionChange;
    this.client.permissionHandler = this.boundPermissionHandler;
    this.dispatch(this.connectionEvent(this.client.connectionState));
  }

  async detach(): Promise<void> {
    if (!this.attached) return;
    this.attached = false;
    if (this.client.onSessionUpdate === this.boundOnSessionUpdate) {
      this.client.onSessionUpdate = undefined;
    }
    if (this.client.onConnectionChange === this.boundOnConnectionChange) {
      this.client.onConnectionChange = undefined;
    }
    if (this.client.permissionHandler === this.boundPermissionHandler) {
      this.client.permissionHandler = cancelPermissionHandler;
    }
    this.runToken += 1;
    await this.settlePermissions();
    if (this.state.run.type === "running") {
      this.dispatch({
        type: "run-end",
        status: { type: "incomplete", reason: "cancelled" },
      });
    }
    this.hasLoaded = false;
  }

  async updateOptions(options: AcpThreadControllerOptions): Promise<void> {
    const clientChanged = options.client !== this.client;
    if (clientChanged) await this.detach();
    this.client = options.client;
    this.permissionsMode = options.permissions ?? "ask";
    this.autoConnect = options.autoConnect ?? true;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
    this.history = options.history;
    if (clientChanged) await this.attach();
  }

  async load(): Promise<void> {
    if (this.loadPromise) {
      return this.loadingHistory === this.history
        ? this.loadPromise
        : this.loadPromise.then(() => this.load());
    }
    if (this.hasLoaded && this.loadedHistory === this.history) return;
    this.dispatch({ type: "load-start" });
    this.loadingHistory = this.history;
    this.loadPromise = this.doLoad().finally(() => {
      this.loadPromise = undefined;
    });
    return this.loadPromise;
  }

  async append(message: AppendMessage): Promise<void> {
    const startRun = message.startRun ?? message.role === "user";
    const userMessage = this.toUserMessage(message);
    this.dispatch({ type: "append-message", message: userMessage });
    await this.recordHistory(userMessage.parentId, userMessage);
    if (!startRun) return;
    await this.run(userMessage.id);
  }

  async edit(message: AppendMessage): Promise<void> {
    await this.append(message);
  }

  async reload(parentId: string | null): Promise<void> {
    const chain = parentId === null ? [] : this.chainTo(parentId);
    for (let i = chain.length - 1; i >= 0; i--) {
      const message = chain[i]!;
      if (message.role === "user") {
        await this.run(message.id);
        return;
      }
    }
  }

  async cancel(): Promise<void> {
    if (this.state.run.type !== "running") return;
    const assistantId = this.state.run.assistantId;
    this.runToken += 1;
    await this.settlePermissions();
    this.dispatch({
      type: "run-end",
      status: { type: "incomplete", reason: "cancelled" },
    });
    await this.client.cancel();
    invokeUserCallback("react-acp", "onCancel", this.onCancel);
    await this.persistAssistantHistory(assistantId);
  }

  async respondToApproval(
    options: RespondToToolApprovalOptions,
  ): Promise<void> {
    const pending = this.pendingPermissions.get(options.approvalId);
    if (!pending) return;
    this.pendingPermissions.delete(options.approvalId);

    const outcome = resolvePermissionOutcome(pending.request, {
      approvalId: options.approvalId,
      approved: options.approved,
      ...(options.optionId !== undefined && { optionId: options.optionId }),
    });
    const optionId =
      outcome.outcome === "selected" ? outcome.optionId : undefined;

    this.dispatch({
      type: "permission-resolved",
      approvalId: options.approvalId,
      approved: options.approved,
      ...(optionId !== undefined && { optionId }),
      cancelled: outcome.outcome === "cancelled",
    });
    pending.resolve(outcome);
  }

  async applyExternalMessages(
    messages: readonly ThreadMessage[],
  ): Promise<void> {
    const converted: AcpThreadMessage[] = [];
    const seen = new Set<string>();
    let parentId: string | null = null;
    for (const message of messages) {
      if (seen.has(message.id)) continue;
      seen.add(message.id);
      converted.push(toAcpThreadMessage(message, parentId));
      parentId = message.id;
    }
    this.recordedHistoryIds.clear();
    for (const id of seen) this.recordedHistoryIds.add(id);
    this.dispatch({
      type: "replace-messages",
      messages: converted,
      headId: parentId,
    });
  }

  async dispose(): Promise<void> {
    await this.detach();
    this.listeners.clear();
    this.loadPromise = undefined;
  }

  private dispatch(event: AcpThreadEvent): void {
    const next = reduceAcpThreadState(this.state, event);
    if (next === this.state) return;
    this.state = next;
    for (const listener of [...this.listeners]) {
      invokeUserCallback("react-acp", "subscribe", listener);
    }
  }

  private connectionEvent(connectionState: AcpConnectionState): AcpThreadEvent {
    return {
      type: "connection",
      connectionState,
      sessionId: this.client.sessionId,
      ...(this.client.agentInfo !== undefined && {
        agentInfo: this.client.agentInfo,
      }),
      ...(this.client.agentCapabilities !== undefined && {
        agentCapabilities: this.client.agentCapabilities,
      }),
    };
  }

  private reportError(error: unknown): void {
    invokeUserCallback("react-acp", "onError", this.onError, toError(error));
  }

  private async doLoad(): Promise<void> {
    const history = this.history;
    const connect = this.autoConnect
      ? this.client.connect().then(
          () => {
            this.dispatch(this.connectionEvent("connected"));
          },
          (error: unknown) => {
            this.dispatch(this.connectionEvent("disconnected"));
            this.reportError(error);
          },
        )
      : Promise.resolve(undefined);

    const loaded = history
      ? history.load().then(
          (repository) => repository,
          (error: unknown) => {
            this.reportError(error);
            return null;
          },
        )
      : Promise.resolve(null);

    const [repository] = await Promise.all([loaded, connect]);

    this.hasLoaded = true;
    this.loadedHistory = history;

    if (!repository) {
      this.dispatch({ type: "load-ready" });
      return;
    }
    this.recordedHistoryIds.clear();
    for (const { message } of repository.messages) {
      this.recordedHistoryIds.add(message.id);
    }
    this.dispatch({
      type: "load-complete",
      items: repository.messages,
      headId: repository.headId ?? null,
    });
  }

  private async settleSupersededPrompt(): Promise<void> {
    const previous = this.inflightPrompt;
    if (!previous) return;
    this.inflightPrompt = undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      previous.then(noop, noop),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, SUPERSEDED_PROMPT_TIMEOUT_MS);
      }),
    ]);
    if (timer !== undefined) clearTimeout(timer);
  }

  private async settlePermissions(): Promise<void> {
    if (this.pendingPermissions.size === 0) return;
    const pending = [...this.pendingPermissions.values()];
    this.pendingPermissions.clear();
    this.dispatch({ type: "permissions-cancelled" });
    for (const entry of pending) entry.resolve({ outcome: "cancelled" });
  }

  private handlePermissionRequest(
    request: AcpPermissionRequest,
  ): Promise<AcpPermissionOutcome> {
    if (this.permissionsMode === "auto-allow") {
      return Promise.resolve(autoAllowPermissionHandler(request));
    }
    if (this.state.run.type !== "running") {
      return Promise.resolve({ outcome: "cancelled" });
    }
    const approvalId = `acp-permission-${(this.permissionCounter += 1)}`;
    this.dispatch({ type: "permission-request", approvalId, request });
    return new Promise<AcpPermissionOutcome>((resolve) => {
      this.pendingPermissions.set(approvalId, { request, resolve });
    });
  }

  private async run(userMessageId: string): Promise<void> {
    if (this.state.run.type === "running") await this.cancel();
    await this.settleSupersededPrompt();

    const user = this.state.messagesById[userMessageId];
    if (user?.role !== "user") return;

    const assistant: AcpAssistantMessage = {
      role: "assistant",
      id: generateId(),
      parentId: userMessageId,
      createdAt: Date.now(),
      status: { type: "running" },
      content: [],
    };
    this.dispatch({ type: "run-start", message: assistant });
    const token = this.runToken;
    const blocks = threadContentToAcpBlocks([
      ...user.content,
      ...user.attachments.flatMap((attachment) => attachment.content ?? []),
    ]);

    let status: MessageStatus;
    const prompt = this.client.prompt(blocks);
    this.inflightPrompt = prompt;
    try {
      status = stopReasonToMessageStatus(await prompt);
    } catch (error) {
      const err = toError(error);
      status = { type: "incomplete", reason: "error", error: err.message };
      this.reportError(err);
    } finally {
      if (this.inflightPrompt === prompt) this.inflightPrompt = undefined;
    }
    if (token !== this.runToken) return;

    await this.settlePermissions();
    this.dispatch({ type: "run-end", status });
    await this.persistAssistantHistory(assistant.id);
  }

  private toUserMessage(message: AppendMessage): AcpUserMessage {
    const requestedParent = message.parentId;
    const parentId =
      requestedParent === null
        ? null
        : requestedParent && this.state.messagesById[requestedParent]
          ? requestedParent
          : this.state.headId;
    const threadMessage = fromThreadMessageLike(
      message as ThreadMessageLike,
      generateId(),
      FALLBACK_USER_STATUS,
    );
    return {
      role: "user",
      id: threadMessage.id,
      parentId,
      createdAt: threadMessage.createdAt.getTime(),
      content:
        threadMessage.role === "user"
          ? (threadMessage.content as AcpUserMessage["content"])
          : [],
      attachments:
        threadMessage.role === "user" ? threadMessage.attachments : [],
    };
  }

  private chainTo(messageId: string): readonly AcpThreadMessage[] {
    const chain: AcpThreadMessage[] = [];
    let id: string | null = messageId;
    const seen = new Set<string>();
    while (id && !seen.has(id)) {
      seen.add(id);
      const message: AcpThreadMessage | undefined = this.state.messagesById[id];
      if (!message) break;
      chain.unshift(message);
      id = message.parentId;
    }
    return chain;
  }

  private async recordHistory(
    parentId: string | null,
    message: AcpThreadMessage,
  ): Promise<void> {
    const history = this.history;
    if (!history || this.recordedHistoryIds.has(message.id)) return;
    this.recordedHistoryIds.add(message.id);
    try {
      await history.append({ parentId, message: toThreadMessage(message) });
    } catch {
      this.recordedHistoryIds.delete(message.id);
    }
  }

  private async persistAssistantHistory(assistantId: string): Promise<void> {
    const message = this.state.messagesById[assistantId];
    if (message?.role !== "assistant") return;
    if (
      message.status.type !== "complete" &&
      message.status.type !== "incomplete"
    )
      return;
    await this.recordHistory(message.parentId, message);
  }
}

const toAcpThreadMessage = (
  message: ThreadMessage,
  parentId: string | null,
): AcpThreadMessage => {
  const createdAt = message.createdAt.getTime();
  if (message.role === "assistant") {
    return {
      role: "assistant",
      id: message.id,
      parentId,
      createdAt,
      status: message.status,
      content: message.content,
    };
  }
  return {
    role: "user",
    id: message.id,
    parentId,
    createdAt,
    content: message.role === "user" ? message.content : [],
    attachments: message.role === "user" ? message.attachments : [],
  };
};

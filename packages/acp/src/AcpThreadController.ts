import {
  fromThreadMessageLike,
  generateId,
  type AppendMessage,
  type MessageStatus,
  type RespondToToolApprovalOptions,
  type ThreadMessage,
  type ThreadMessageLike,
} from "@assistant-ui/core";
import { invokeUserCallback } from "@assistant-ui/core/internal";
import { autoAllowPermissionHandler, type AcpClient } from "./AcpClient";
import {
  filterPromptBlocks,
  resolvePermissionOutcome,
  stopReasonToMessageStatus,
  threadContentToAcpBlocks,
} from "./conversions";
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
  AcpContentBlock,
  AcpPermissionOutcome,
  AcpPermissionRequest,
  AcpSessionUpdate,
  AcpStopReason,
} from "./types";

export type AcpPermissionsMode = "ask" | "auto-allow";

export type AcpThreadControllerOptions = {
  client: AcpClient;
  permissions?: AcpPermissionsMode | undefined;
  autoConnect?: boolean | undefined;
  onError?: ((error: Error) => void) | undefined;
  onCancel?: (() => void) | undefined;
};

export type AcpThreadControllerLike = {
  getState(): AcpThreadState;
  subscribe(listener: () => void): () => void;
  attach(): Promise<void>;
  detach(): Promise<void>;
  updateOptions(options: AcpThreadControllerOptions): Promise<void>;
  load(): Promise<void>;
  append(message: AppendMessage): Promise<void>;
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

type ClaimedRun = {
  token: number;
  prompt: Promise<AcpStopReason>;
};

export class AcpThreadController implements AcpThreadControllerLike {
  private state: AcpThreadState;
  private readonly listeners = new Set<() => void>();
  private readonly pendingPermissions = new Map<string, PendingPermission>();
  private client: AcpClient;
  private permissionsMode: AcpPermissionsMode;
  private autoConnect: boolean;
  private onError: ((error: Error) => void) | undefined;
  private onCancel: (() => void) | undefined;
  private loadPromise: Promise<void> | undefined;
  private hasLoaded = false;
  private runToken = 0;
  private permissionCounter = 0;
  private attached = false;
  private inflightPrompt: Promise<unknown> | undefined;
  private startLock: Promise<void> = Promise.resolve();
  private unsubscribeSessionUpdate: (() => void) | undefined;
  private unsubscribeConnectionChange: (() => void) | undefined;
  private restorePermissionHandler: (() => void) | undefined;

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
    this.state = createAcpThreadState();
  }

  getState = (): AcpThreadState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Subscribes instead of assigning: a caller-owned `AcpClient` keeps its own
   * listeners, and a `permissionHandler` the caller configured stays in charge
   * of approvals. Whatever this replaces is restored by `detach()`.
   */
  async attach(): Promise<void> {
    if (this.attached) return;
    this.attached = true;
    this.unsubscribeSessionUpdate = this.client.subscribeSessionUpdate(
      this.boundOnSessionUpdate,
    );
    this.unsubscribeConnectionChange = this.client.subscribeConnectionChange(
      this.boundOnConnectionChange,
    );
    if (!this.client.hasConfiguredPermissionHandler) {
      const client = this.client;
      const previous = client.permissionHandler;
      this.restorePermissionHandler = () => {
        client.permissionHandler = previous;
      };
      client.permissionHandler = this.boundPermissionHandler;
    }
    this.dispatch(this.connectionEvent(this.client.connectionState));
  }

  async detach(): Promise<void> {
    if (!this.attached) return;
    this.attached = false;
    this.unsubscribeSessionUpdate?.();
    this.unsubscribeSessionUpdate = undefined;
    this.unsubscribeConnectionChange?.();
    this.unsubscribeConnectionChange = undefined;
    this.restorePermissionHandler?.();
    this.restorePermissionHandler = undefined;
    this.runToken += 1;
    await this.settlePermissions();
    if (this.state.run.type === "running") {
      this.dispatch({
        type: "run-end",
        status: { type: "incomplete", reason: "cancelled" },
      });
      try {
        await this.client.cancel();
      } catch {
        // an unsendable cancel must not reject teardown
      }
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
    if (clientChanged) await this.attach();
  }

  async load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    if (this.hasLoaded) return;
    this.dispatch({ type: "load-start" });
    this.loadPromise = this.doLoad().finally(() => {
      this.loadPromise = undefined;
    });
    return this.loadPromise;
  }

  async append(message: AppendMessage): Promise<void> {
    const startRun = message.startRun ?? message.role === "user";
    const userMessage = this.toUserMessage(message);
    this.dispatch({ type: "append-message", message: userMessage });
    if (!startRun) return;
    await this.run(userMessage.id);
  }

  async cancel(): Promise<void> {
    if (this.state.run.type !== "running") return;
    this.runToken += 1;
    await this.settlePermissions();
    this.dispatch({
      type: "run-end",
      status: { type: "incomplete", reason: "cancelled" },
    });
    await this.client.cancel();
    invokeUserCallback("acp", "onCancel", this.onCancel);
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
      invokeUserCallback("acp", "subscribe", listener);
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
    invokeUserCallback("acp", "onError", this.onError, toError(error));
  }

  private reportDroppedBlocks(dropped: readonly AcpContentBlock[]): void {
    const kinds = [...new Set(dropped.map((block) => block.type))].join(", ");
    this.reportError(
      new Error(
        `The agent's promptCapabilities do not cover ${kinds}; dropped ` +
          `${dropped.length} block(s) from this prompt.`,
      ),
    );
  }

  /**
   * Connects and marks the thread ready. The transcript is not restored from
   * storage: the agent owns the conversation, and a UI that shows messages the
   * agent has no context for would silently fork it.
   */
  private async doLoad(): Promise<void> {
    if (this.autoConnect) {
      try {
        await this.client.connect();
        this.dispatch(this.connectionEvent("connected"));
      } catch (error) {
        this.dispatch(this.connectionEvent("disconnected"));
        this.reportError(error);
      }
    }
    this.hasLoaded = true;
    this.dispatch({ type: "load-ready" });
  }

  private async settleSupersededPrompt(): Promise<void> {
    const previous = this.inflightPrompt;
    if (!previous) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      previous.then(noop, noop),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, SUPERSEDED_PROMPT_TIMEOUT_MS);
      }),
    ]);
    if (timer !== undefined) clearTimeout(timer);
    if (this.inflightPrompt === previous) this.inflightPrompt = undefined;
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

  /**
   * Serializes run prologues so two concurrent replacements cannot capture the
   * same `runToken`. The lock covers the prologue up to sending the prompt, not
   * the turn itself: the loser's prompt only settles because the winner cancels
   * it, and that cancel happens inside the prologue.
   */
  private withStartLock<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.startLock.then(fn, fn);
    this.startLock = result.then(noop, noop);
    return result;
  }

  private async claimRun(
    userMessageId: string,
  ): Promise<ClaimedRun | undefined> {
    if (this.state.run.type === "running") await this.cancel();
    await this.settleSupersededPrompt();

    const user = this.state.messagesById[userMessageId];
    if (user?.role !== "user") return undefined;

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
    const { blocks, dropped } = filterPromptBlocks(
      threadContentToAcpBlocks([
        ...user.content,
        ...user.attachments.flatMap((attachment) => attachment.content ?? []),
      ]),
      this.client.agentCapabilities?.promptCapabilities,
    );
    if (dropped.length > 0) this.reportDroppedBlocks(dropped);
    const prompt = this.client.prompt(blocks);
    this.inflightPrompt = prompt;
    return { token, prompt };
  }

  private async run(userMessageId: string): Promise<void> {
    const claimed = await this.withStartLock(() =>
      this.claimRun(userMessageId),
    );
    if (!claimed) return;
    const { token, prompt } = claimed;

    let status: MessageStatus;
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

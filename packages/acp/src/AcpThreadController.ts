import {
  fromThreadMessageLike,
  generateId,
  type AppendMessage,
  type MessageStatus,
  type RespondToToolApprovalOptions,
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
  permissions?: AcpPermissionsMode | undefined;
  autoConnect?: boolean | undefined;
  onError?: ((error: Error) => void) | undefined;
  onCancel?: (() => void) | undefined;
};

const FALLBACK_USER_STATUS = { type: "complete", reason: "unknown" } as const;

const CANCELLED_STATUS = { type: "incomplete", reason: "cancelled" } as const;

const noop = () => {};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

type PendingPermission = {
  request: AcpPermissionRequest;
  resolve: (outcome: AcpPermissionOutcome) => void;
};

type InflightPrompt = {
  readonly assistantId: string;
  readonly prompt: Promise<AcpStopReason>;
};

type ClaimedRun = InflightPrompt & { readonly token: number };

type ThreadEpoch = { readonly ended: Promise<void>; end(): void };

type StartOwner = {
  readonly attached: number;
  readonly stops: number;
  readonly epoch: ThreadEpoch;
};

const createEpoch = (): ThreadEpoch => {
  let end = noop;
  const ended = new Promise<void>((resolve) => {
    end = resolve;
  });
  return { ended, end };
};

/**
 * Owns one thread on one `AcpClient`: the transcript, the running turn and its
 * approvals. A client belongs to its controller for the controller's lifetime.
 */
export class AcpThreadController {
  private state: AcpThreadState = createAcpThreadState();
  private readonly listeners = new Set<() => void>();
  private readonly pendingPermissions = new Map<string, PendingPermission>();
  private readonly client: AcpClient;
  private permissionsMode: AcpPermissionsMode = "ask";
  private autoConnect = true;
  private onError: ((error: Error) => void) | undefined;
  private onCancel: (() => void) | undefined;
  private loadPromise: Promise<void> | undefined;
  private hasLoaded = false;
  private runToken = 0;
  private detachToken = 0;
  private permissionCounter = 0;
  private attached = false;
  private inflight: InflightPrompt | undefined;
  private runAbort: AbortController | undefined;
  private startLock: Promise<void> = Promise.resolve();
  private stops = 0;
  private epoch = createEpoch();
  private detachFromClient: (() => void) | undefined;

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

  constructor(
    options: AcpThreadControllerOptions & { readonly client: AcpClient },
  ) {
    this.client = options.client;
    this.updateOptions(options);
  }

  getState = (): AcpThreadState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Subscribes instead of assigning, so a caller-owned `AcpClient` keeps its
   * own listeners, and a `permissionHandler` it was constructed with keeps
   * answering approvals ahead of this controller.
   */
  attach(): void {
    if (this.attached) return;
    this.attached = true;
    const unsubscribes = [
      this.client.subscribeSessionUpdate(this.boundOnSessionUpdate),
      this.client.subscribeConnectionChange(this.boundOnConnectionChange),
      this.client.registerPermissionHandler(this.boundPermissionHandler),
    ];
    this.detachFromClient = () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
    this.dispatch(this.connectionEvent(this.client.connectionState));
  }

  async detach(): Promise<void> {
    if (!this.attached) return;
    this.attached = false;
    this.detachFromClient?.();
    this.detachFromClient = undefined;
    this.detachToken += 1;
    this.hasLoaded = false;
    await this.stopRun();
  }

  updateOptions(options: AcpThreadControllerOptions): void {
    this.permissionsMode = options.permissions ?? "ask";
    this.autoConnect = options.autoConnect ?? true;
    this.onError = options.onError;
    this.onCancel = options.onCancel;
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
    this.stops += 1;
    if (!(await this.stopRun())) return;
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

  /**
   * Ends the thread together with its ACP session: the transcript clears and
   * the next prompt opens a new session. It is also the way out of a session
   * a dropped connection could not restore.
   */
  async startNewThread(): Promise<void> {
    this.epoch.end();
    this.epoch = createEpoch();
    const stopping = this.stopRun();
    this.runToken += 1;
    this.inflight = undefined;
    this.client.resetSession();
    this.dispatch({ type: "reset", threadId: generateId() });
    await stopping;
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
      agentInfo: this.client.agentInfo,
      agentCapabilities: this.client.agentCapabilities,
      sessionModes: this.client.modes,
      sessionConfigOptions: this.client.configOptions,
    };
  }

  private reportError(error: unknown): void {
    invokeUserCallback("acp", "onError", this.onError, toError(error));
  }

  private droppedBlocksError(dropped: readonly AcpContentBlock[]): Error {
    const kinds = [...new Set(dropped.map((block) => block.type))].join(", ");
    return new Error(
      `The agent's promptCapabilities do not cover ${kinds}; dropped ` +
        `${dropped.length} block(s) from this prompt.`,
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
      } catch (error) {
        this.reportError(error);
      }
      this.dispatch(this.connectionEvent(this.client.connectionState));
    }
    this.hasLoaded = true;
    this.dispatch({ type: "load-ready" });
  }

  private settlePermissions(): void {
    if (this.pendingPermissions.size === 0) return;
    const pending = [...this.pendingPermissions.values()];
    this.pendingPermissions.clear();
    this.dispatch({ type: "permissions-cancelled" });
    for (const entry of pending) entry.resolve({ outcome: "cancelled" });
  }

  /**
   * Ends the running turn as cancelled and tells the agent. A turn whose prompt
   * is already on the wire keeps receiving the tool call updates the agent may
   * still send, until that prompt settles.
   */
  private async stopRun(): Promise<boolean> {
    if (this.state.run.type !== "running") return false;
    const assistantId = this.state.run.assistantId;
    this.runToken += 1;
    this.runAbort?.abort();
    this.settlePermissions();
    this.dispatch({
      type: "run-end",
      assistantId,
      status: CANCELLED_STATUS,
      settling: this.inflight?.assistantId === assistantId,
    });
    try {
      await this.client.cancel();
    } catch {
      // an unsendable cancel must not reject the stop
    }
    return true;
  }

  /**
   * Only the running turn's prompt can ask. While a stopped turn is settling,
   * or before the running turn's prompt went out, a request belongs to a turn
   * the user already stopped and is cancelled, as ACP requires.
   */
  private handlePermissionRequest(
    request: AcpPermissionRequest,
  ): Promise<AcpPermissionOutcome> {
    const running =
      this.state.run.type === "running"
        ? this.state.run.assistantId
        : undefined;
    if (
      running === undefined ||
      this.state.settlingAssistantId !== undefined ||
      this.inflight?.assistantId !== running
    ) {
      return Promise.resolve({ outcome: "cancelled" });
    }
    if (this.permissionsMode === "auto-allow") {
      return Promise.resolve(autoAllowPermissionHandler(request));
    }
    const approvalId = `acp-permission-${(this.permissionCounter += 1)}`;
    return new Promise<AcpPermissionOutcome>((resolve) => {
      this.pendingPermissions.set(approvalId, { request, resolve });
      this.dispatch({ type: "permission-request", approvalId, request });
    });
  }

  /**
   * Starts a turn for `userMessageId` once every earlier start has sent its
   * prompt or given up, so each message the thread shows reaches the agent
   * before a later one supersedes it. A stop, detach or new thread that lands
   * before the prompt is sent withholds it, along with every start queued
   * behind it: an agent must never run a turn the user already stopped.
   */
  private async run(userMessageId: string): Promise<void> {
    const owner: StartOwner = {
      attached: this.detachToken,
      stops: this.stops,
      epoch: this.epoch,
    };
    const start = this.startLock.then(() =>
      this.claimRun(userMessageId, owner),
    );
    this.startLock = start.then(noop, noop);
    const claimed = await start;
    if (!claimed) return;
    const { token, assistantId, prompt } = claimed;

    let status: MessageStatus;
    try {
      status = stopReasonToMessageStatus(await prompt);
    } catch (error) {
      const err = toError(error);
      status = { type: "incomplete", reason: "error", error: err.message };
      if (token === this.runToken) this.reportError(err);
    } finally {
      if (this.inflight?.prompt === prompt) this.inflight = undefined;
      this.dispatch({ type: "run-settled", assistantId });
    }
    if (token !== this.runToken) return;

    this.settlePermissions();
    this.dispatch({ type: "run-end", assistantId, status });
  }

  /**
   * `session/update` carries no turn id, so a superseded turn still on the wire
   * would render its remaining frames inside the new message. The new prompt
   * therefore waits for the superseded one to settle. There is no deadline: ACP
   * requires an agent to answer a cancelled `session/prompt` with
   * `stopReason: "cancelled"`, and the client rejects every pending request when
   * the socket drops. Only a new thread, whose session the old turn cannot
   * reach, stops waiting early.
   */
  private async claimRun(
    userMessageId: string,
    owner: StartOwner,
  ): Promise<ClaimedRun | undefined> {
    if (!this.owns(owner)) return undefined;
    const user = this.state.messagesById[userMessageId];
    if (user?.role !== "user") return undefined;
    const superseded = this.inflight;
    void this.stopRun();

    const assistant: AcpAssistantMessage = {
      role: "assistant",
      id: generateId(),
      parentId: userMessageId,
      createdAt: Date.now(),
      status: { type: "running" },
      content: [],
    };
    this.runToken += 1;
    const token = this.runToken;
    const abort = new AbortController();
    this.runAbort = abort;
    this.dispatch({ type: "run-start", message: assistant });

    if (superseded) {
      await Promise.race([
        superseded.prompt.then(noop, noop),
        owner.epoch.ended,
      ]);
      if (this.inflight === superseded) this.inflight = undefined;
      this.dispatch({
        type: "run-settled",
        assistantId: superseded.assistantId,
      });
    }
    const current = () => token === this.runToken && this.owns(owner);
    if (!current()) return undefined;

    const blocks = threadContentToAcpBlocks([
      ...user.content,
      ...user.attachments.flatMap((attachment) => attachment.content ?? []),
    ]);
    let prompt: Promise<AcpStopReason>;
    try {
      // the start lock is held until the prompt is on the wire, so the session
      // is opened here and promptCapabilities exist once the handshake ran
      const initialized = await this.client.connect();
      await this.client.ensureSession();
      if (!current()) return undefined;
      const filtered = filterPromptBlocks(
        blocks,
        initialized.agentCapabilities?.promptCapabilities,
      );
      if (filtered.blocks.length === 0) {
        throw filtered.dropped.length > 0
          ? this.droppedBlocksError(filtered.dropped)
          : new Error("The message has no content the agent can receive.");
      }
      if (filtered.dropped.length > 0) {
        this.reportError(this.droppedBlocksError(filtered.dropped));
      }
      prompt = this.client.prompt(filtered.blocks, abort.signal);
    } catch (error) {
      prompt = Promise.reject(toError(error));
    }
    this.inflight = { assistantId: assistant.id, prompt };
    return { token, assistantId: assistant.id, prompt };
  }

  private owns(owner: StartOwner): boolean {
    return (
      owner.attached === this.detachToken &&
      owner.stops === this.stops &&
      owner.epoch === this.epoch
    );
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

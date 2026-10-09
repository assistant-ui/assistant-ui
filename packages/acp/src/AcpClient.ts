import type {
  LoadSessionResponse,
  NewSessionResponse,
} from "@agentclientprotocol/sdk";
import { invokeUserCallback, isRecord } from "@assistant-ui/core/internal";
import { preferredPermissionOption } from "./conversions";
import {
  ACP_PROTOCOL_VERSION,
  type AcpAgentCapabilities,
  type AcpConnectionState,
  type AcpContentBlock,
  type AcpImplementation,
  type AcpInitializeResponse,
  type AcpMcpServer,
  type AcpPermissionOutcome,
  type AcpPermissionRequest,
  type AcpSessionConfigOption,
  type AcpSessionModeState,
  type AcpSessionUpdate,
  type AcpStopReason,
} from "./types";

export type AcpWebSocketLike = {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((event?: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event?: { code?: number; reason?: string }) => void) | null;
  onerror: ((event?: unknown) => void) | null;
};

export type AcpWebSocketFactory = (url: string) => AcpWebSocketLike;

export type AcpPermissionHandler = (
  request: AcpPermissionRequest,
) => AcpPermissionOutcome | Promise<AcpPermissionOutcome>;

export type AcpSessionUpdateListener = (
  sessionId: string,
  update: AcpSessionUpdate,
) => void;

export type AcpConnectionListener = (state: AcpConnectionState) => void;

export type AcpClientOptions = {
  /** WebSocket endpoint of the ACP agent, e.g. `ws://127.0.0.1:2770/`. */
  url: string;
  /**
   * Absolute working directory on the agent's host, sent with `session/new`
   * and `session/load`. The agent roots its file and terminal tools here.
   */
  cwd: string;
  /** MCP servers passed to `session/new` and `session/load`. */
  mcpServers?: readonly AcpMcpServer[];
  /** Client identity for the `initialize` handshake. */
  clientInfo?: AcpImplementation;
  /** Inject a WebSocket implementation (tests / custom transports). */
  webSocketFactory?: AcpWebSocketFactory;
  /**
   * Reply deadline for lifecycle requests, in milliseconds. `session/prompt`
   * has none, because a turn has no bounded duration, and every frame of a
   * `session/load` replay restarts the deadline of that request.
   */
  requestTimeoutMs?: number;
  /**
   * Answers `session/request_permission`, ahead of any handler registered
   * through `registerPermissionHandler`. With neither, every request is
   * refused: an agent must never act on a decision nobody configured.
   */
  permissionHandler?: AcpPermissionHandler;
};

type AcpSession = Pick<
  NewSessionResponse,
  "sessionId" | "modes" | "configOptions"
>;

type JsonRpcId = number | string;

type PendingRequest = {
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout> | undefined;
};

type DeadlineWatcher = (restart: () => void) => void;

export class AcpError extends Error {
  readonly code: number;
  readonly data: unknown;

  constructor(message: string, code: number, data?: unknown) {
    super(message);
    this.name = "AcpError";
    this.code = code;
    this.data = data;
  }
}

export const autoAllowPermissionHandler: AcpPermissionHandler = (request) => {
  const option = preferredPermissionOption(request.options, true);
  return option
    ? { outcome: "selected", optionId: option.optionId }
    : { outcome: "cancelled" };
};

export const cancelPermissionHandler: AcpPermissionHandler = () => ({
  outcome: "cancelled",
});

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

const ACP_CLIENT_VERSION: string =
  typeof __AUI_PACKAGE_VERSION__ === "string"
    ? __AUI_PACKAGE_VERSION__
    : "0.0.0";

const defaultWebSocketFactory: AcpWebSocketFactory = (url) =>
  new WebSocket(url) as unknown as AcpWebSocketLike;

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const isPermissionOption = (option: unknown) =>
  isRecord(option) &&
  typeof option.optionId === "string" &&
  typeof option.name === "string" &&
  typeof option.kind === "string";

const isPermissionRequest = (params: unknown): params is AcpPermissionRequest =>
  isRecord(params) &&
  typeof params.sessionId === "string" &&
  isRecord(params.toolCall) &&
  typeof params.toolCall.toolCallId === "string" &&
  Array.isArray(params.options) &&
  params.options.every(isPermissionOption);

export class AcpClient {
  private readonly options: AcpClientOptions;
  private ws: AcpWebSocketLike | undefined;
  private nextId = 1;
  private readonly pending = new Map<JsonRpcId, PendingRequest>();
  private readonly pendingPermissions = new Map<
    JsonRpcId,
    (outcome: AcpPermissionOutcome) => void
  >();
  private readonly permissionHandlers: {
    readonly handler: AcpPermissionHandler;
  }[] = [];
  private connectPromise: Promise<AcpInitializeResponse> | undefined;
  private failHandshake: ((error: Error) => void) | undefined;
  private sessionPromise: Promise<string> | undefined;
  private sessionGeneration = 0;
  private initializeResult: AcpInitializeResponse | undefined;
  private _sessionId: string | undefined;
  private _connectionState: AcpConnectionState = "disconnected";
  private disposed = false;
  private cancelSent = false;
  private lostSessionId: string | undefined;
  private readonly retiredSessionIds = new Set<string>();
  private restartLoadDeadline: (() => void) | undefined;
  private sessionModes: AcpSessionModeState | undefined;
  private sessionConfigOptions: readonly AcpSessionConfigOption[] | undefined;
  private readonly sessionUpdateListeners = new Set<AcpSessionUpdateListener>();
  private readonly connectionListeners = new Set<AcpConnectionListener>();

  constructor(options: AcpClientOptions) {
    this.options = options;
  }

  subscribeSessionUpdate(listener: AcpSessionUpdateListener): () => void {
    this.sessionUpdateListeners.add(listener);
    return () => {
      this.sessionUpdateListeners.delete(listener);
    };
  }

  subscribeConnectionChange(listener: AcpConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  /**
   * Answers `session/request_permission` while the client has no
   * `permissionHandler` option. The most recently registered handler answers;
   * the returned function unregisters this one.
   */
  registerPermissionHandler(handler: AcpPermissionHandler): () => void {
    const registration = { handler };
    this.permissionHandlers.push(registration);
    return () => {
      const index = this.permissionHandlers.indexOf(registration);
      if (index !== -1) this.permissionHandlers.splice(index, 1);
    };
  }

  get connectionState(): AcpConnectionState {
    return this._connectionState;
  }

  get sessionId(): string | undefined {
    return this._sessionId;
  }

  get agentInfo(): AcpImplementation | undefined {
    return this.initializeResult?.agentInfo ?? undefined;
  }

  get agentCapabilities(): AcpAgentCapabilities | undefined {
    return this.initializeResult?.agentCapabilities;
  }

  /** Initial mode state reported by `session/new` or `session/load`. */
  get modes(): AcpSessionModeState | undefined {
    return this.sessionModes;
  }

  /** Initial config options reported by `session/new` or `session/load`. */
  get configOptions(): readonly AcpSessionConfigOption[] | undefined {
    return this.sessionConfigOptions;
  }

  connect(): Promise<AcpInitializeResponse> {
    if (this.disposed) {
      return Promise.reject(new Error("AcpClient is disposed"));
    }
    if (this._connectionState === "connected" && this.initializeResult) {
      return Promise.resolve(this.initializeResult);
    }
    this.connectPromise ??= this.doConnect().finally(() => {
      this.connectPromise = undefined;
    });
    return this.connectPromise;
  }

  ensureSession(): Promise<string> {
    if (this._sessionId) return Promise.resolve(this._sessionId);
    if (!this.sessionPromise) {
      const opening = this.openSession(this.sessionGeneration).finally(() => {
        if (this.sessionPromise === opening) this.sessionPromise = undefined;
      });
      this.sessionPromise = opening;
    }
    return this.sessionPromise;
  }

  /**
   * Forgets the current session, including one a dropped connection lost, so
   * the next prompt opens a new one with `session/new`. Whatever the old
   * session still sends is dropped; a turn running on it is not cancelled.
   */
  resetSession(): void {
    this.sessionGeneration += 1;
    this.sessionPromise = undefined;
    if (this._sessionId !== undefined)
      this.retiredSessionIds.add(this._sessionId);
    if (this.lostSessionId !== undefined)
      this.retiredSessionIds.add(this.lostSessionId);
    const hadSession = this._sessionId !== undefined;
    this._sessionId = undefined;
    this.lostSessionId = undefined;
    this.sessionModes = undefined;
    this.sessionConfigOptions = undefined;
    this.cancelSent = false;
    if (hadSession) this.emitConnectionChange();
  }

  /**
   * Sends `session/prompt`. An aborted `signal` cancels the turn before it is
   * sent, including while `session/new` or `session/load` is still in flight:
   * an agent must never run a turn the user already stopped.
   */
  async prompt(
    content: readonly AcpContentBlock[],
    signal?: AbortSignal,
  ): Promise<AcpStopReason> {
    if (signal?.aborted) return "cancelled";
    const sessionId = this._sessionId ?? (await this.ensureSession());
    if (signal?.aborted) return "cancelled";
    this.cancelSent = false;
    const result = await this.request<{ stopReason?: AcpStopReason }>(
      "session/prompt",
      { sessionId, prompt: content },
      null,
    );
    return result.stopReason ?? "end_turn";
  }

  async cancel(): Promise<void> {
    this.settlePermissions({ outcome: "cancelled" });
    if (!this._sessionId || this._connectionState !== "connected") return;
    if (this.cancelSent) return;
    this.sendNotification("session/cancel", { sessionId: this._sessionId });
    this.cancelSent = true;
  }

  dispose(): void {
    this.disposed = true;
    this.settlePermissions({ outcome: "cancelled" });
    this.failHandshake?.(new Error("AcpClient disposed"));
    const ws = this.ws;
    this.ws = undefined;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try {
        ws.close();
      } catch {
        // a throwing transport must not strand the cleanup below
      }
    }
    this.failPending(new Error("AcpClient disposed"));
    this.connectPromise = undefined;
    this.sessionPromise = undefined;
    this.notifyDisconnected();
    this.sessionUpdateListeners.clear();
    this.connectionListeners.clear();
    this.permissionHandlers.length = 0;
  }

  private emitConnectionChange() {
    for (const listener of [...this.connectionListeners]) {
      invokeUserCallback(
        "acp",
        "onConnectionChange",
        listener,
        this._connectionState,
      );
    }
  }

  private setConnectionState(state: AcpConnectionState) {
    if (this._connectionState === state) return;
    this._connectionState = state;
    this.emitConnectionChange();
  }

  /**
   * Drops session data and reports `"disconnected"`. Notifies only when something
   * observable changed, so a handshake failure followed by `onclose`, or a
   * `dispose()` that interrupted one, reports it exactly once.
   */
  private notifyDisconnected() {
    const hadSession =
      this._sessionId !== undefined || this.initializeResult !== undefined;
    if (this._sessionId !== undefined) this.lostSessionId = this._sessionId;
    this._sessionId = undefined;
    this.initializeResult = undefined;
    this.sessionModes = undefined;
    this.sessionConfigOptions = undefined;
    this.cancelSent = false;
    const stateChanged = this._connectionState !== "disconnected";
    this._connectionState = "disconnected";
    if (stateChanged || hadSession) this.emitConnectionChange();
  }

  private settlePermissions(outcome: AcpPermissionOutcome): void {
    if (this.pendingPermissions.size === 0) return;
    const settle = [...this.pendingPermissions.values()];
    this.pendingPermissions.clear();
    for (const resolve of settle) resolve(outcome);
  }

  private doConnect(): Promise<AcpInitializeResponse> {
    return new Promise<AcpInitializeResponse>((resolve, reject) => {
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        this.failHandshake = undefined;
        this.notifyDisconnected();
        reject(error);
      };
      // registered first: a synchronous onConnectionChange listener may dispose
      // the client, and dispose() must be able to fail this handshake
      this.failHandshake = fail;
      this.setConnectionState("connecting");
      if (settled) return;

      let ws: AcpWebSocketLike;
      try {
        ws = (this.options.webSocketFactory ?? defaultWebSocketFactory)(
          this.options.url,
        );
      } catch (error) {
        fail(toError(error));
        return;
      }
      this.ws = ws;
      const isCurrent = () => this.ws === ws;

      ws.onopen = () => {
        if (!isCurrent()) return;
        void (async () => {
          try {
            const result = await this.request<AcpInitializeResponse>(
              "initialize",
              {
                protocolVersion: ACP_PROTOCOL_VERSION,
                clientCapabilities: {},
                clientInfo: this.options.clientInfo ?? {
                  name: "@assistant-ui/acp",
                  version: ACP_CLIENT_VERSION,
                },
              },
            );
            if (!isCurrent()) return;
            if (result.protocolVersion !== ACP_PROTOCOL_VERSION) {
              throw new Error(
                `The agent speaks ACP protocol version ${String(result.protocolVersion)}; ` +
                  `this client speaks version ${ACP_PROTOCOL_VERSION}.`,
              );
            }
            this.initializeResult = result;
            if (settled) return;
            settled = true;
            this.failHandshake = undefined;
            this.setConnectionState("connected");
            resolve(result);
          } catch (error) {
            if (!isCurrent()) return;
            fail(toError(error));
            ws.close();
          }
        })();
      };
      ws.onmessage = (event) => {
        if (!isCurrent()) return;
        this.handleMessage(typeof event.data === "string" ? event.data : "");
      };
      ws.onclose = () => {
        if (!isCurrent()) return;
        this.handleClose();
        fail(new Error("ACP WebSocket closed before handshake completed"));
      };
      ws.onerror = () => {
        if (!isCurrent()) return;
        fail(
          new Error(`ACP WebSocket connection to ${this.options.url} failed`),
        );
      };
    });
  }

  private async openSession(generation: number): Promise<string> {
    await this.connect();
    const lost = this.lostSessionId;
    const session =
      lost === undefined
        ? await this.request<NewSessionResponse>(
            "session/new",
            this.sessionParams(),
          )
        : await this.loadSession(lost);
    if (generation !== this.sessionGeneration) {
      this.retiredSessionIds.add(session.sessionId);
      throw new Error("The ACP session was reset before it finished opening.");
    }
    this._sessionId = session.sessionId;
    this.lostSessionId = undefined;
    this.sessionModes = session.modes ?? undefined;
    this.sessionConfigOptions = session.configOptions ?? undefined;
    this.emitConnectionChange();
    return session.sessionId;
  }

  /**
   * A dropped connection leaves the agent without the transcript the UI still
   * shows, so a reconnect must not quietly continue it. `session/load` restores
   * the session when the agent advertises it; otherwise the caller gets an
   * error it can turn into a "start a new thread" prompt. The lost id survives a
   * failed attempt, so every later one keeps refusing instead of forking.
   *
   * The agent answers `session/load` only after replaying the whole transcript
   * as `session/update` notifications. That replay is history the thread state
   * already holds, so updates for the lost session are dropped until the load
   * succeeds, and after a load that failed or timed out. Each replayed frame
   * restarts the request's deadline, so a long transcript can finish replaying
   * while an agent that goes quiet still fails the load.
   */
  private async loadSession(sessionId: string): Promise<AcpSession> {
    const unusable = (reason: string) =>
      new Error(
        `The ACP connection dropped session ${sessionId} and it could not be ` +
          `restored (${reason}). Start a new thread to continue.`,
      );
    if (!this.agentCapabilities?.loadSession) {
      throw unusable("the agent does not support session/load");
    }
    const params = { sessionId, ...this.sessionParams() };
    let loaded: LoadSessionResponse;
    try {
      loaded = await this.request<LoadSessionResponse>(
        "session/load",
        params,
        this.lifecycleTimeoutMs(),
        (restart) => {
          this.restartLoadDeadline = restart;
        },
      );
    } catch (error) {
      throw unusable(`session/load failed: ${toError(error).message}`);
    } finally {
      this.restartLoadDeadline = undefined;
    }
    return { ...loaded, sessionId };
  }

  /**
   * HTTP and SSE servers need the agent to advertise the transport. ACP-transport
   * servers route MCP traffic through the client over `mcp/message`, which this
   * client does not implement, so they are never sent.
   */
  private sessionParams() {
    const mcpServers = this.options.mcpServers ?? [];
    const accepted = this.agentCapabilities?.mcpCapabilities;
    const unsupported = mcpServers.filter(
      (server) =>
        "type" in server && (server.type === "acp" || !accepted?.[server.type]),
    );
    if (unsupported.length > 0) {
      throw new Error(
        `The agent's mcpCapabilities do not cover ${unsupported
          .map(
            (server) =>
              `${server.name} (${"type" in server ? server.type : "stdio"})`,
          )
          .join(", ")}; remove it from mcpServers.`,
      );
    }
    return { cwd: this.options.cwd, mcpServers };
  }

  private handleClose(): void {
    this.failPending(new Error("ACP WebSocket connection closed"));
    this.settlePermissions({ outcome: "cancelled" });
    this.ws = undefined;
    this.notifyDisconnected();
  }

  private failPending(error: Error): void {
    for (const [, pending] of this.pending) {
      if (pending.timer !== undefined) clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  private handleMessage(raw: string): void {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg !== "object") return;

    if (typeof msg.method === "string") {
      if (msg.id !== undefined) this.handleServerRequest(msg);
      else this.handleNotification(msg);
      return;
    }

    if (msg.id === undefined) return;
    const pending = this.pending.get(msg.id);
    if (!pending) return;
    this.pending.delete(msg.id);
    if (pending.timer !== undefined) clearTimeout(pending.timer);
    if (msg.error) {
      pending.reject(
        new AcpError(
          msg.error.message ?? "ACP request failed",
          msg.error.code ?? -1,
          msg.error.data,
        ),
      );
    } else {
      pending.resolve(msg.result);
    }
  }

  private handleServerRequest(msg: any): void {
    if (msg.method !== "session/request_permission") {
      this.sendRaw({
        jsonrpc: "2.0",
        id: msg.id,
        error: { code: -32601, message: `Method not supported: ${msg.method}` },
      });
      return;
    }
    if (!isPermissionRequest(msg.params)) {
      this.sendRaw({
        jsonrpc: "2.0",
        id: msg.id,
        error: {
          code: -32602,
          message: "Invalid session/request_permission params",
        },
      });
      return;
    }
    if (msg.params.sessionId !== this._sessionId) {
      this.sendRaw({
        jsonrpc: "2.0",
        id: msg.id,
        result: { outcome: { outcome: "cancelled" } },
      });
      return;
    }
    this.handlePermissionRequest(msg.id as JsonRpcId, msg.params);
  }

  private handlePermissionRequest(
    requestId: JsonRpcId,
    params: AcpPermissionRequest,
  ): void {
    let settled = false;
    const reply = (outcome: AcpPermissionOutcome) => {
      if (settled) return;
      settled = true;
      this.pendingPermissions.delete(requestId);
      try {
        this.sendRaw({ jsonrpc: "2.0", id: requestId, result: { outcome } });
      } catch {
        // the socket is already gone; permission replies are best-effort
      }
    };
    this.pendingPermissions.set(requestId, reply);

    const handler =
      this.options.permissionHandler ??
      this.permissionHandlers.at(-1)?.handler ??
      cancelPermissionHandler;
    let handled: Promise<AcpPermissionOutcome>;
    try {
      handled = Promise.resolve(handler(params));
    } catch (error) {
      invokeUserCallback("acp", "permissionHandler", () => {
        throw error;
      });
      reply({ outcome: "cancelled" });
      return;
    }
    void handled.then(reply, () => reply({ outcome: "cancelled" }));
  }

  private handleNotification(msg: any): void {
    if (msg.method !== "session/update") return;
    const params = msg.params as
      | { sessionId?: unknown; update?: AcpSessionUpdate }
      | undefined;
    if (typeof params?.sessionId !== "string" || !isRecord(params.update))
      return;
    const { sessionId, update } = params;
    if (sessionId === this.lostSessionId) this.restartLoadDeadline?.();
    if (!this.acceptsUpdatesFor(sessionId)) return;
    for (const listener of [...this.sessionUpdateListeners]) {
      invokeUserCallback("acp", "onSessionUpdate", listener, sessionId, update);
    }
  }

  /**
   * Only the current session's updates are delivered. Before one is current, an
   * opening session may report itself ahead of its `session/new` response, so
   * updates pass while an opening is pending, except for a lost or retired id.
   */
  private acceptsUpdatesFor(sessionId: string): boolean {
    if (this._sessionId !== undefined) return sessionId === this._sessionId;
    return (
      this.sessionPromise !== undefined &&
      sessionId !== this.lostSessionId &&
      !this.retiredSessionIds.has(sessionId)
    );
  }

  private lifecycleTimeoutMs(): number {
    return this.options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  private request<TResult>(
    method: string,
    params: unknown,
    timeoutMs: number | null = this.lifecycleTimeoutMs(),
    watchDeadline?: DeadlineWatcher,
  ): Promise<TResult> {
    if (this._connectionState !== "connected" && method !== "initialize") {
      return Promise.reject(
        new Error(`Cannot send ${method}: ACP client is not connected`),
      );
    }
    const id = this.nextId++;
    return new Promise<TResult>((resolve, reject) => {
      const arm = () => {
        if (timeoutMs === null) return undefined;
        const timer = setTimeout(() => {
          if (!this.pending.has(id)) return;
          this.pending.delete(id);
          reject(new Error(`ACP ${method} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        (timer as unknown as { unref?: () => void }).unref?.();
        return timer;
      };
      const entry: PendingRequest = { resolve, reject, timer: arm() };
      this.pending.set(id, entry);
      watchDeadline?.(() => {
        if (!this.pending.has(id)) return;
        if (entry.timer !== undefined) clearTimeout(entry.timer);
        entry.timer = arm();
      });
      try {
        this.sendRaw({ jsonrpc: "2.0", id, method, params });
      } catch (error) {
        this.pending.delete(id);
        if (entry.timer !== undefined) clearTimeout(entry.timer);
        reject(toError(error));
      }
    });
  }

  private sendNotification(method: string, params: unknown): void {
    this.sendRaw({ jsonrpc: "2.0", method, params });
  }

  private sendRaw(frame: unknown): void {
    this.ws?.send(JSON.stringify(frame));
  }
}

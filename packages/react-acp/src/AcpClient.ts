import { invokeUserCallback } from "@assistant-ui/core/internal";
import { isAllowKind } from "./conversions";
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

export type AcpClientOptions = {
  /** WebSocket endpoint of the ACP agent, e.g. `ws://127.0.0.1:2770/`. */
  url: string;
  /**
   * Working directory passed to `session/new`. ACP requires an absolute path;
   * defaults to `"/"`. Set this when the agent's file tools should be rooted
   * somewhere specific.
   */
  cwd?: string;
  /** MCP servers passed to `session/new`. */
  mcpServers?: readonly AcpMcpServer[];
  /** Client identity for the `initialize` handshake. */
  clientInfo?: AcpImplementation;
  /** Inject a WebSocket implementation (tests / custom transports). */
  webSocketFactory?: AcpWebSocketFactory;
  /**
   * Reply deadline for lifecycle requests, in milliseconds. `session/prompt`
   * is exempt because a turn has no bounded duration.
   */
  requestTimeoutMs?: number;
  /**
   * Answers `session/request_permission`. Defaults to
   * `cancelPermissionHandler`, which refuses every request: an agent must
   * never be allowed to act on a decision the caller did not configure.
   */
  permissionHandler?: AcpPermissionHandler;
};

type JsonRpcId = number | string;

type PendingRequest = {
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout> | undefined;
};

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
  const option = request.options.find((o) => isAllowKind(o.kind));
  return option
    ? { outcome: "selected", optionId: option.optionId }
    : { outcome: "cancelled" };
};

export const cancelPermissionHandler: AcpPermissionHandler = () => ({
  outcome: "cancelled",
});

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

const defaultWebSocketFactory: AcpWebSocketFactory = (url) =>
  new WebSocket(url) as unknown as AcpWebSocketLike;

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export class AcpClient {
  private readonly options: AcpClientOptions;
  private ws: AcpWebSocketLike | undefined;
  private nextId = 1;
  private readonly pending = new Map<JsonRpcId, PendingRequest>();
  private readonly pendingPermissions = new Map<
    JsonRpcId,
    (outcome: AcpPermissionOutcome) => void
  >();
  private connectPromise: Promise<AcpInitializeResponse> | undefined;
  private failHandshake: ((error: Error) => void) | undefined;
  private sessionPromise: Promise<string> | undefined;
  private initializeResult: AcpInitializeResponse | undefined;
  private _sessionId: string | undefined;
  private _connectionState: AcpConnectionState = "disconnected";
  private _permissionHandler: AcpPermissionHandler;
  private disposed = false;

  onSessionUpdate:
    | ((sessionId: string, update: AcpSessionUpdate) => void)
    | undefined;
  onConnectionChange: ((state: AcpConnectionState) => void) | undefined;

  constructor(options: AcpClientOptions) {
    this.options = options;
    this._permissionHandler =
      options.permissionHandler ?? cancelPermissionHandler;
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

  get permissionHandler(): AcpPermissionHandler {
    return this._permissionHandler;
  }

  set permissionHandler(handler: AcpPermissionHandler) {
    this._permissionHandler = handler;
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
    this.sessionPromise ??= this.doNewSession().finally(() => {
      this.sessionPromise = undefined;
    });
    return this.sessionPromise;
  }

  async prompt(content: readonly AcpContentBlock[]): Promise<AcpStopReason> {
    const sessionId = await this.ensureSession();
    const result = await this.request<{ stopReason?: AcpStopReason }>(
      "session/prompt",
      { sessionId, prompt: content },
      undefined,
    );
    return result.stopReason ?? "end_turn";
  }

  async cancel(): Promise<void> {
    this.settlePermissions({ outcome: "cancelled" });
    if (!this._sessionId || this._connectionState !== "connected") return;
    this.sendNotification("session/cancel", { sessionId: this._sessionId });
  }

  respondPermission(requestId: JsonRpcId, outcome: AcpPermissionOutcome): void {
    const settle = this.pendingPermissions.get(requestId);
    if (settle) {
      settle(outcome);
      return;
    }
    this.sendRaw({ jsonrpc: "2.0", id: requestId, result: { outcome } });
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
    this.initializeResult = undefined;
    this._sessionId = undefined;
    this.connectPromise = undefined;
    this.sessionPromise = undefined;
    this._connectionState = "disconnected";
    this.emitConnectionChange();
  }

  private emitConnectionChange() {
    invokeUserCallback(
      "react-acp",
      "onConnectionChange",
      this.onConnectionChange,
      this._connectionState,
    );
  }

  private setConnectionState(state: AcpConnectionState) {
    if (this._connectionState === state) return;
    this._connectionState = state;
    this.emitConnectionChange();
  }

  private settlePermissions(outcome: AcpPermissionOutcome): void {
    if (this.pendingPermissions.size === 0) return;
    const settle = [...this.pendingPermissions.values()];
    this.pendingPermissions.clear();
    for (const resolve of settle) resolve(outcome);
  }

  private doConnect(): Promise<AcpInitializeResponse> {
    return new Promise<AcpInitializeResponse>((resolve, reject) => {
      this.setConnectionState("connecting");
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        this.failHandshake = undefined;
        this.setConnectionState("disconnected");
        reject(error);
      };
      this.failHandshake = fail;

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
                  name: "react-acp",
                  version: "0.1.0",
                },
              },
            );
            if (!isCurrent()) return;
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

  private async doNewSession(): Promise<string> {
    await this.connect();
    const result = await this.request<{ sessionId: string }>("session/new", {
      cwd: this.options.cwd ?? "/",
      mcpServers: this.options.mcpServers ?? [],
    });
    this._sessionId = result.sessionId;
    this.emitConnectionChange();
    return result.sessionId;
  }

  private handleClose(): void {
    this.failPending(new Error("ACP WebSocket connection closed"));
    this.settlePermissions({ outcome: "cancelled" });
    this.ws = undefined;
    this._sessionId = undefined;
    this.initializeResult = undefined;
    this._connectionState = "disconnected";
    this.emitConnectionChange();
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
    if (msg.method === "session/request_permission") {
      this.handlePermissionRequest(
        msg.id as JsonRpcId,
        msg.params as AcpPermissionRequest,
      );
      return;
    }
    this.sendRaw({
      jsonrpc: "2.0",
      id: msg.id,
      error: { code: -32601, message: `Method not supported: ${msg.method}` },
    });
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

    let handled: Promise<AcpPermissionOutcome>;
    try {
      handled = Promise.resolve(this.permissionHandler(params));
    } catch (error) {
      invokeUserCallback("react-acp", "permissionHandler", () => {
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
      | { sessionId: string; update: AcpSessionUpdate }
      | undefined;
    if (!params?.update) return;
    invokeUserCallback(
      "react-acp",
      "onSessionUpdate",
      this.onSessionUpdate,
      params.sessionId,
      params.update,
    );
  }

  private request<TResult>(
    method: string,
    params: unknown,
    timeoutMs: number | undefined = this.options.requestTimeoutMs ??
      DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<TResult> {
    if (this._connectionState !== "connected" && method !== "initialize") {
      return Promise.reject(
        new Error(`Cannot send ${method}: ACP client is not connected`),
      );
    }
    const id = this.nextId++;
    return new Promise<TResult>((resolve, reject) => {
      const timer =
        timeoutMs === undefined
          ? undefined
          : setTimeout(() => {
              if (!this.pending.has(id)) return;
              this.pending.delete(id);
              reject(new Error(`ACP ${method} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
      if (timer !== undefined) {
        (timer as unknown as { unref?: () => void }).unref?.();
      }
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.sendRaw({ jsonrpc: "2.0", id, method, params });
      } catch (error) {
        this.pending.delete(id);
        if (timer !== undefined) clearTimeout(timer);
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

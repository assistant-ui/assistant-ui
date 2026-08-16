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
import { isAllowKind } from "./conversions";

/** Minimal WebSocket surface (browser WebSocket and Node >= 22 both satisfy it). */
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
  /** Working directory passed to `session/new`. */
  cwd?: string;
  /** MCP servers passed to `session/new`. */
  mcpServers?: readonly AcpMcpServer[];
  /** Client identity for the `initialize` handshake. */
  clientInfo?: AcpImplementation;
  /** Inject a WebSocket implementation (tests / custom transports). */
  webSocketFactory?: AcpWebSocketFactory;
};

type JsonRpcId = number | string;

type PendingRequest = {
  resolve: (result: any) => void;
  reject: (error: Error) => void;
};

export class AcpError extends Error {
  constructor(
    message: string,
    readonly code: number,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = "AcpError";
  }
}

/**
 * Default permission policy: pick the first allow-family option, else the
 * first option, else cancel. Keeps headless clients from hanging.
 */
export const autoAllowPermissionHandler: AcpPermissionHandler = (request) => {
  const option =
    request.options.find((o) => isAllowKind(o.kind)) ?? request.options[0];
  return option
    ? { outcome: "selected", optionId: option.optionId }
    : { outcome: "cancelled" };
};

const defaultWebSocketFactory: AcpWebSocketFactory = (url) =>
  new WebSocket(url) as unknown as AcpWebSocketLike;

export class AcpClient {
  private readonly options: AcpClientOptions;
  private ws: AcpWebSocketLike | undefined;
  private nextId = 1;
  private readonly pending = new Map<JsonRpcId, PendingRequest>();
  private connectPromise: Promise<AcpInitializeResponse> | undefined;
  private sessionPromise: Promise<string> | undefined;
  private initializeResult: AcpInitializeResponse | undefined;
  private _sessionId: string | undefined;
  private _connectionState: AcpConnectionState = "disconnected";

  /** Invoked for every `session/update` notification. */
  onSessionUpdate:
    | ((sessionId: string, update: AcpSessionUpdate) => void)
    | undefined;
  /** Invoked for `session/request_permission` server requests. */
  permissionHandler: AcpPermissionHandler = autoAllowPermissionHandler;
  /** Invoked whenever the connection state changes. */
  onConnectionChange: ((state: AcpConnectionState) => void) | undefined;

  constructor(options: AcpClientOptions) {
    this.options = options;
  }

  get connectionState(): AcpConnectionState {
    return this._connectionState;
  }

  get sessionId(): string | undefined {
    return this._sessionId;
  }

  get agentInfo(): AcpImplementation | undefined {
    return this.initializeResult?.agentInfo;
  }

  get agentCapabilities(): AcpAgentCapabilities | undefined {
    return this.initializeResult?.agentCapabilities;
  }

  /** Open the WebSocket and run the `initialize` handshake (idempotent). */
  connect(): Promise<AcpInitializeResponse> {
    if (this._connectionState === "connected" && this.initializeResult) {
      return Promise.resolve(this.initializeResult);
    }
    this.connectPromise ??= this.doConnect().finally(() => {
      this.connectPromise = undefined;
    });
    return this.connectPromise;
  }

  /** Get (or create) the ACP session for this connection. */
  ensureSession(): Promise<string> {
    if (this._sessionId) return Promise.resolve(this._sessionId);
    this.sessionPromise ??= this.doNewSession().finally(() => {
      this.sessionPromise = undefined;
    });
    return this.sessionPromise;
  }

  /** Send a prompt and resolve when the turn completes. */
  async prompt(content: readonly AcpContentBlock[]): Promise<AcpStopReason> {
    const sessionId = await this.ensureSession();
    const result = await this.request<{ stopReason?: AcpStopReason }>(
      "session/prompt",
      { sessionId, content },
    );
    return result.stopReason ?? "end_turn";
  }

  /** Ask the agent to cancel the current turn. */
  async cancel(): Promise<void> {
    if (!this._sessionId || this._connectionState !== "connected") return;
    try {
      await this.request("session/cancel", { sessionId: this._sessionId });
    } catch {
      // best effort — the caller already aborted locally
    }
  }

  /** Answer a pending `session/request_permission` server request. */
  respondPermission(requestId: JsonRpcId, outcome: AcpPermissionOutcome): void {
    this.sendRaw({ jsonrpc: "2.0", id: requestId, result: { outcome } });
  }

  /** Close the connection and reject everything in flight. */
  dispose(): void {
    const ws = this.ws;
    this.ws = undefined;
    ws?.close();
    this.failPending(new Error("AcpClient disposed"));
    this.setConnectionState("disconnected");
  }

  // --- internals ---

  private setConnectionState(state: AcpConnectionState) {
    if (this._connectionState === state) return;
    this._connectionState = state;
    this.onConnectionChange?.(state);
  }

  private doConnect(): Promise<AcpInitializeResponse> {
    return new Promise<AcpInitializeResponse>((resolve, reject) => {
      this.setConnectionState("connecting");
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        this.setConnectionState("disconnected");
        reject(error);
      };

      let ws: AcpWebSocketLike;
      try {
        ws = (this.options.webSocketFactory ?? defaultWebSocketFactory)(
          this.options.url,
        );
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      this.ws = ws;

      ws.onopen = () => {
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
            this.initializeResult = result;
            this.sendNotification("notifications/initialized", {});
            if (settled) return;
            settled = true;
            this.setConnectionState("connected");
            resolve(result);
          } catch (error) {
            fail(error instanceof Error ? error : new Error(String(error)));
            ws.close();
          }
        })();
      };
      ws.onmessage = (event) => {
        this.handleMessage(typeof event.data === "string" ? event.data : "");
      };
      ws.onclose = () => {
        this.handleClose();
        fail(new Error("ACP WebSocket closed before handshake completed"));
      };
      ws.onerror = () => {
        fail(
          new Error(`ACP WebSocket connection to ${this.options.url} failed`),
        );
      };
    });
  }

  private async doNewSession(): Promise<string> {
    await this.connect();
    const result = await this.request<{ sessionId: string }>("session/new", {
      cwd: this.options.cwd ?? ".",
      mcpServers: this.options.mcpServers ?? [],
    });
    this._sessionId = result.sessionId;
    return result.sessionId;
  }

  private handleClose(): void {
    this.failPending(new Error("ACP WebSocket connection closed"));
    this.ws = undefined;
    this._sessionId = undefined;
    this.setConnectionState("disconnected");
  }

  private failPending(error: Error): void {
    for (const [, pending] of this.pending) pending.reject(error);
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

    if (msg.id !== undefined) {
      const pending = this.pending.get(msg.id);
      if (!pending) return;
      this.pending.delete(msg.id);
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
  }

  private handleServerRequest(msg: any): void {
    if (msg.method === "session/request_permission") {
      const params = msg.params as AcpPermissionRequest;
      void Promise.resolve(this.permissionHandler(params)).then(
        (outcome) => this.respondPermission(msg.id, outcome),
        () => this.respondPermission(msg.id, { outcome: "cancelled" }),
      );
      return;
    }
    // Browser clients advertise no fs/terminal capabilities; anything else
    // arriving here is unsupported.
    this.sendRaw({
      jsonrpc: "2.0",
      id: msg.id,
      error: { code: -32601, message: `Method not supported: ${msg.method}` },
    });
  }

  private handleNotification(msg: any): void {
    if (msg.method !== "session/update") return;
    const params = msg.params as
      | { sessionId: string; update: AcpSessionUpdate }
      | undefined;
    if (!params?.update) return;
    this.onSessionUpdate?.(params.sessionId, params.update);
  }

  private request<TResult>(method: string, params: unknown): Promise<TResult> {
    if (this._connectionState !== "connected" && method !== "initialize") {
      return Promise.reject(
        new Error(`Cannot send ${method}: ACP client is not connected`),
      );
    }
    const id = this.nextId++;
    return new Promise<TResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try {
        this.sendRaw({ jsonrpc: "2.0", id, method, params });
      } catch (error) {
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
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

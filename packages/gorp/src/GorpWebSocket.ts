import type { GorpMessage } from "./Gorp";

export type ConnectionState = "connecting" | "connected" | "disconnected";

const TOTAL_BUDGET_MS = 60 * 60 * 1000; // matches GorpSessions TTL
const MAX_BACKOFF_MS = 30 * 1000;

/**
 * Plain `WebSocket` transport for `GorpClient`. Manages the socket lifecycle
 * — URL handshake with `?sessionId=&fromSeq=`, reconnect-with-backoff
 * (1s→30s, 1h total budget), JSON framing — but knows nothing about ops or
 * pending queues. Pair with `bindClient(client, transport)` for the
 * outbox / apply / resync wiring.
 */
export class GorpWebSocket<C> {
  private readonly url: string;
  private readonly sessionId: string;
  private readonly getFromSeq: () => number;
  private readonly messageListeners = new Set<(msg: GorpMessage) => void>();
  private readonly connectListeners = new Set<() => void>();
  private readonly connectionListeners = new Set<
    (state: ConnectionState) => void
  >();

  private ws: WebSocket | null = null;
  private reconnect = {
    attempts: 0,
    timer: null as ReturnType<typeof setTimeout> | null,
    startMs: null as number | null,
  };
  private _connection: ConnectionState = "connecting";
  private closed = false;

  constructor(opts: {
    url: string;
    sessionId: string;
    getFromSeq: () => number;
  }) {
    this.url = opts.url;
    this.sessionId = opts.sessionId;
    this.getFromSeq = opts.getFromSeq;
    this.connect();
  }

  get connection(): ConnectionState {
    return this._connection;
  }

  onMessage(callback: (msg: GorpMessage) => void): () => void {
    this.messageListeners.add(callback);
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  onConnect(callback: () => void): () => void {
    this.connectListeners.add(callback);
    return () => {
      this.connectListeners.delete(callback);
    };
  }

  onConnectionChange(callback: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(callback);
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  send(command: C): void {
    this.ws?.send(JSON.stringify(command));
  }

  close(): void {
    this.closed = true;
    if (this.reconnect.timer !== null) {
      clearTimeout(this.reconnect.timer);
      this.reconnect.timer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  private setConnection(next: ConnectionState): void {
    if (this._connection === next) return;
    this._connection = next;
    for (const listener of this.connectionListeners) listener(next);
  }

  private connect(): void {
    if (this.closed) return;
    if (this.reconnect.timer !== null) {
      clearTimeout(this.reconnect.timer);
      this.reconnect.timer = null;
    }
    const fromSeq = this.getFromSeq();
    const sep = this.url.includes("?") ? "&" : "?";
    const fullUrl = `${this.url}${sep}sessionId=${encodeURIComponent(this.sessionId)}&fromSeq=${fromSeq}`;
    this.setConnection("connecting");
    const ws = new WebSocket(fullUrl);
    this.ws = ws;
    ws.onopen = () => {
      this.setConnection("connected");
      this.reconnect.attempts = 0;
      this.reconnect.startMs = null;
      for (const listener of this.connectListeners) listener();
    };
    ws.onmessage = (event) => {
      const msg: GorpMessage = JSON.parse(String(event.data));
      for (const listener of this.messageListeners) listener(msg);
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      this.ws = null;
      if (this.closed) return;
      if (this.reconnect.startMs === null) this.reconnect.startMs = Date.now();
      const elapsed = Date.now() - this.reconnect.startMs;
      if (elapsed > TOTAL_BUDGET_MS) {
        this.setConnection("disconnected");
        return;
      }
      const delay = Math.min(
        1000 * 2 ** this.reconnect.attempts,
        MAX_BACKOFF_MS,
      );
      this.reconnect.attempts += 1;
      this.setConnection("connecting");
      this.reconnect.timer = setTimeout(() => this.connect(), delay);
    };
  }
}

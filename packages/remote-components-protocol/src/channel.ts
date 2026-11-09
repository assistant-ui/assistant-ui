import { decode, encode, getAtPath, type Encoded, type Path } from "./codec.js";
import {
  deserializeError,
  RemoteComponentError,
  serializeError,
  type SerializedError,
} from "./errors.js";
import type { FnRef } from "./messages.js";

/** The subset of MessagePort the channel needs (lets tests use fakes). */
export interface PortLike {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (ev: MessageEvent) => void): void;
  removeEventListener(
    type: "message",
    listener: (ev: MessageEvent) => void,
  ): void;
  start?(): void;
  close(): void;
}

type MethodMap<T> = { [K in keyof T]: [unknown, unknown] };
type EventMap<T> = { [K in keyof T]: object };

export interface ChannelOptions {
  /** Structural validator for incoming messages (see validate.ts). `known` (optional) tells unknown notifications apart, which are dropped without `onInvalid`. */
  validate: ((msg: unknown) => boolean) & { known?: (msg: unknown) => boolean };
  /** Called for every dropped message; default ignores. */
  onInvalid?: (msg: unknown) => void;
}

/** The cancellation notification, sent in both directions. */
export const CANCELLED = "rc/notifications/cancelled";

// AbortSignal.any sits above the repository's browserslist floor (Safari 16.4).
function anySignal(signals: readonly AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
      signal: controller.signal,
    });
  }
  return controller.signal;
}

/** JSON-RPC error number for a remote-components error code. */
export function jsonRpcCode(code: string | undefined): number {
  return code === "unsupported"
    ? -32601
    : code === "protocol"
      ? -32600
      : -32000;
}

/**
 * One end of a remote-components channel over a dedicated MessagePort.
 * Messages are JSON-RPC 2.0 shaped (messages.ts): notifications
 * (fire-and-forget) and requests (exactly one response each).
 *
 *   OutN / InN: notifications sent / received
 *   OutM / InM: methods called on the peer / served for the peer
 *
 * Ordering: messages are delivered in send order (MessagePort is FIFO).
 * Closing rejects every pending request with a `closed` error.
 */
export class Channel<
  OutN extends EventMap<OutN>,
  InN extends EventMap<InN>,
  OutM extends MethodMap<OutM>,
  InM extends MethodMap<InM>,
> {
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: unknown) => void }
  >();
  private readonly handlers = new Map<string, Set<(params: never) => void>>();
  private readonly methodHandlers = new Map<
    string,
    (params: never, ctx: RequestContext) => unknown
  >();
  /** Requests being served, by id, so the peer can cancel them. */
  private readonly inflight = new Map<number, AbortController>();
  private closed = false;
  private readonly listener = (ev: MessageEvent): void => this.receive(ev.data);

  private readonly port: PortLike;
  private readonly options: ChannelOptions;

  constructor(port: PortLike, options: ChannelOptions) {
    this.port = port;
    this.options = options;
    port.addEventListener("message", this.listener);
    port.start?.();
  }

  get isClosed(): boolean {
    return this.closed;
  }

  /** Sends a notification. */
  notify<K extends keyof OutN & string>(method: K, params: OutN[K]): void {
    if (this.closed) return;
    this.port.postMessage({ jsonrpc: "2.0", method, params });
  }

  /** Listens for a notification; returns an unsubscribe function. */
  on<K extends keyof InN & string>(
    method: K,
    handler: (params: InN[K]) => void,
  ): () => void {
    let set = this.handlers.get(method);
    if (set === undefined) this.handlers.set(method, (set = new Set()));
    set.add(handler as (params: never) => void);
    return () => set.delete(handler as (params: never) => void);
  }

  handle<K extends keyof InM & string>(
    method: K,
    handler: (
      params: InM[K][0],
      ctx: RequestContext,
    ) => InM[K][1] | Promise<InM[K][1]>,
  ): void {
    this.methodHandlers.set(
      method,
      handler as (params: never, ctx: RequestContext) => unknown,
    );
  }

  /**
   * Sends a request. With `signal`, aborting rejects the promise at once
   * (with the signal's reason) and tells the peer
   * (`rc/notifications/cancelled`), whose handler sees its `ctx.signal` abort.
   */
  request<K extends keyof OutM & string>(
    method: K,
    params: OutM[K][0],
    options: { signal?: AbortSignal } = {},
  ): Promise<OutM[K][1]> {
    if (this.closed)
      return Promise.reject(
        new RemoteComponentError(
          "closed",
          "The remote component channel is closed",
        ),
      );
    const { signal } = options;
    if (signal?.aborted === true) return Promise.reject(abortReason(signal));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const onAbort = (): void => {
        if (!this.pending.delete(id)) return;
        reject(abortReason(signal!));
        if (!this.closed)
          this.port.postMessage({
            jsonrpc: "2.0",
            method: CANCELLED,
            params: { requestId: id },
          });
      };
      this.pending.set(id, {
        resolve: (v) => {
          signal?.removeEventListener("abort", onAbort);
          resolve(v as OutM[K][1]);
        },
        reject: (e) => {
          signal?.removeEventListener("abort", onAbort);
          reject(e);
        },
      });
      signal?.addEventListener("abort", onAbort, { once: true });
      try {
        this.port.postMessage({ jsonrpc: "2.0", id, method, params });
      } catch (err) {
        // Not cloneable: nothing was sent.
        this.pending
          .get(id)
          ?.reject(
            new RemoteComponentError(
              "data",
              `Could not send "${method}": ${String(err)}`,
            ),
          );
        this.pending.delete(id);
      }
    });
  }

  close(reason = "The remote component channel was closed"): void {
    if (this.closed) return;
    this.closed = true;
    this.port.removeEventListener("message", this.listener);
    this.port.close();
    const err = new RemoteComponentError("closed", reason);
    for (const p of this.pending.values()) p.reject(err);
    this.pending.clear();
    for (const c of this.inflight.values()) c.abort(err);
    this.inflight.clear();
    this.handlers.clear();
    this.methodHandlers.clear();
  }

  private receive(msg: unknown): void {
    if (this.closed) return;
    if (!this.options.validate(msg)) {
      // Notifications from a newer peer are dropped silently; malformed messages are reported.
      if (this.options.validate.known?.(msg) !== false)
        this.options.onInvalid?.(msg);
      return;
    }
    const m = msg as {
      id?: number;
      method?: string;
      params?: unknown;
      result?: unknown;
      error?: { data: SerializedError };
    };
    if (m.method === undefined) {
      const p = this.pending.get(m.id!);
      if (p === undefined) return;
      this.pending.delete(m.id!);
      if (m.error === undefined) p.resolve(m.result);
      else p.reject(deserializeError(m.error.data));
      return;
    }
    if (m.id === undefined) {
      if (m.method === CANCELLED) {
        this.inflight
          .get((m.params as { requestId: number }).requestId)
          ?.abort(
            new RemoteComponentError(
              "cancelled",
              "The caller cancelled this call",
            ),
          );
        return;
      }
      const handlers = this.handlers.get(m.method);
      if (handlers === undefined) return;
      for (const h of [...handlers]) h(m.params as never);
      return;
    }
    const { id, method } = m as { id: number; method: string };
    const handler = this.methodHandlers.get(method);
    if (handler === undefined) {
      this.respondError(
        id,
        new RemoteComponentError(
          "unsupported",
          `Method "${method}" is not supported by the other side`,
        ),
      );
      return;
    }
    // A peer that reuses the id of a call still being served would take
    // over its cancellation entry: refuse the second call.
    if (this.inflight.has(id)) {
      this.respondError(
        id,
        new RemoteComponentError(
          "protocol",
          `Request id ${id} is already in use`,
        ),
      );
      return;
    }
    const controller = new AbortController();
    this.inflight.set(id, controller);
    let result: unknown;
    try {
      result = handler(m.params as never, { signal: controller.signal });
    } catch (err) {
      this.inflight.delete(id);
      this.respondError(id, err);
      return;
    }
    Promise.resolve(result)
      .finally(() => this.inflight.delete(id))
      .then(
        (value) => {
          if (this.closed) return;
          try {
            this.port.postMessage({ jsonrpc: "2.0", id, result: value });
          } catch (err) {
            // value was not cloneable
            this.respondError(
              id,
              new RemoteComponentError(
                "data",
                `Result of "${method}" could not be sent: ${String(err)}`,
              ),
            );
          }
        },
        (err: unknown) => this.respondError(id, err),
      );
  }

  private respondError(id: number, err: unknown): void {
    if (this.closed) return;
    const data = serializeError(err);
    this.port.postMessage({
      jsonrpc: "2.0",
      id,
      error: { code: jsonRpcCode(data.code), message: data.message, data },
    });
  }
}

/** Passed to request handlers. `signal` aborts when the caller cancels or the channel closes. */
export interface RequestContext {
  signal: AbortSignal;
}

function abortReason(signal: AbortSignal): unknown {
  return (
    signal.reason ?? new DOMException("The operation was aborted", "AbortError")
  );
}

/* ------------------------------------------------------------------------ */
/* Function references                                                      */
/* ------------------------------------------------------------------------ */

type CallFn = (
  ref: FnRef,
  args: Encoded,
  signal?: AbortSignal,
) => Promise<Encoded>;

/**
 * Builds proxies for function references in values received from the peer.
 * Proxies are cached per (scope, path) so they are referentially stable
 * across prop updates.
 */
export class FunctionProxies {
  private readonly cache = new Map<
    string,
    (...args: unknown[]) => Promise<unknown>
  >();

  private readonly call: CallFn;

  constructor(call: CallFn) {
    this.call = call;
  }

  get(scope: string, path: Path): (...args: unknown[]) => Promise<unknown> {
    const key = `${scope}\u0000${JSON.stringify(path)}`;
    let fn = this.cache.get(key);
    if (fn === undefined) {
      const ref: FnRef = { scope, path: [...path] };
      fn = async (...args: unknown[]) => {
        const encArgs = encode(args, {
          allowFunctions: false,
          allowSignals: true,
          label: "arguments",
        });
        // AbortSignals in the arguments cancel the call (the callee gets its own signal in their place).
        const signals = (encArgs.s ?? []).map(
          (p) => getAtPath(args, p) as AbortSignal,
        );
        const signal =
          signals.length === 0
            ? undefined
            : signals.length === 1
              ? signals[0]
              : anySignal(signals);
        const result = await this.call(ref, encArgs, signal);
        return decode(result, () => {
          throw new RemoteComponentError(
            "data",
            "Functions cannot be returned from a remote call",
          );
        });
      };
      this.cache.set(key, fn);
    }
    return fn;
  }

  /** Decodes an encoded value, putting proxies (bound to `scope`) at its function paths. */
  decode(scope: string, enc: Encoded, basePath: Path = []): unknown {
    return decode(enc, (p) => this.get(scope, [...basePath, ...p]));
  }

  /** Drops cached proxies for a scope (e.g. when an overlay closes). */
  dropScope(scope: string): void {
    const prefix = `${scope}\u0000`;
    for (const key of [...this.cache.keys()])
      if (key.startsWith(prefix)) this.cache.delete(key);
  }
}

/**
 * Serves `rc/call` requests by resolving references against the latest value
 * of each registered scope.
 */
export class FunctionTargets {
  private readonly scopes = new Map<
    string,
    { getRoot: () => unknown; allows: ((path: Path) => boolean) | undefined }
  >();

  /**
   * Registers a scope; `getRoot` returns the scope's current value.
   * `allows(path)` says whether a function at `path` was sent to the peer.
   * Without it, any function reachable through own properties can be
   * called. With it, only paths the peer received (so a value that failed
   * to encode, or a non-enumerable property, never exposes its functions).
   */
  register(
    scope: string,
    getRoot: () => unknown,
    allows?: (path: Path) => boolean,
  ): () => void {
    const entry = { getRoot, allows };
    this.scopes.set(scope, entry);
    return () => {
      if (this.scopes.get(scope) === entry) this.scopes.delete(scope);
    };
  }

  async invoke(
    ref: FnRef,
    args: Encoded,
    signal?: AbortSignal,
  ): Promise<Encoded> {
    const entry = this.scopes.get(ref.scope);
    if (entry === undefined)
      throw new RemoteComponentError(
        "stale-function",
        `Function scope "${ref.scope}" no longer exists`,
      );
    const where = `${ref.scope}${ref.path.map((k) => `[${JSON.stringify(k)}]`).join("")}`;
    if (entry.allows !== undefined && !entry.allows(ref.path)) {
      throw new RemoteComponentError(
        "stale-function",
        `No function was sent at ${where}`,
      );
    }
    const fn = getAtPath(entry.getRoot(), ref.path);
    if (typeof fn !== "function") {
      throw new RemoteComponentError(
        "stale-function",
        `No function at ${where}`,
      );
    }
    const callSignal = signal ?? new AbortController().signal;
    const decodedArgs = decode(
      args,
      () => {
        throw new RemoteComponentError(
          "data",
          "Functions cannot be passed as call arguments",
        );
      },
      () => callSignal,
    );
    if (!Array.isArray(decodedArgs))
      throw new RemoteComponentError(
        "protocol",
        "Call arguments must be an array",
      );
    const result: unknown = await (fn as (...a: unknown[]) => unknown)(
      ...decodedArgs,
    );
    return encode(result, { allowFunctions: false, label: "return value" });
  }
}

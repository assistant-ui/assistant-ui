export type LocalMethod = (...args: any[]) => unknown;

/** Methods one side exposes to the other. */
export interface API {
  [method: string]: LocalMethod;
}

/** The other side's methods; every call resolves with its result. */
export interface RemoteAPI {
  [method: string]: (...args: any[]) => Promise<any>;
}

export interface Connection {
  remote: RemoteAPI;
  localApi: API;
  setLocalApi(api: API): Promise<void>;
  remoteMethodsWaitPromise: Promise<void>;
}

export const TYPE_MESSAGE = "message";
export const TYPE_RESPONSE = "response";
export const TYPE_SET_INTERFACE = "set-interface";
export const TYPE_SERVICE_MESSAGE = "service-message";

export type ConnectionMessage =
  | {
      type: typeof TYPE_MESSAGE | typeof TYPE_SERVICE_MESSAGE;
      callId: string;
      methodName: string;
      arguments: unknown[];
    }
  | { type: typeof TYPE_SET_INTERFACE; callId: string; apiMethods: string[] }
  | {
      type: typeof TYPE_RESPONSE;
      callId: string;
      success: boolean;
      result: unknown;
    };

type Pending = {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};

type Post = (message: ConnectionMessage) => void;

function defineOwn(target: object, key: string, value: unknown) {
  Object.defineProperty(target, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

/**
 * Errors cross the boundary as plain objects of their own enumerable
 * properties plus `name` and `message`; the stack stays on its own side.
 */
export function serializeError(error: Error): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(error)) {
    defineOwn(out, key, (error as unknown as Record<string, unknown>)[key]);
  }
  out["name"] = error.name;
  out["message"] = error.message;
  return out;
}

export function deserializeError(value: unknown): unknown {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as { message?: unknown }).message !== "string"
  ) {
    return value;
  }
  const error = new Error((value as { message: string }).message);
  for (const key of Object.keys(value)) {
    defineOwn(error, key, (value as Record<string, unknown>)[key]);
  }
  return error;
}

function isDataCloneError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "DataCloneError"
  );
}

/**
 * The host half of the websandbox RPC protocol. Messages are queued until a
 * transport is attached, and every pending call settles on detach or dispose.
 */
export class HostConnection implements Connection {
  remote: RemoteAPI = {};
  localApi: API = {};
  readonly remoteMethodsWaitPromise: Promise<void>;

  #resolveRemoteMethods!: () => void;
  #exposed = new Set<string>();
  #serviceMethods: API = {};
  #callbacks = new Map<string, Pending>();
  #nextId = 0;
  #post: Post | null = null;
  #queue: { message: ConnectionMessage; callId: string }[] = [];
  #disposedReason: Error | null = null;

  constructor() {
    this.remoteMethodsWaitPromise = new Promise((resolve) => {
      this.#resolveRemoteMethods = resolve;
    });
  }

  setServiceMethods(methods: API) {
    this.#serviceMethods = methods;
  }

  setLocalApi(api: API): Promise<void> {
    this.localApi = api;
    this.#exposed = new Set(Object.keys(api));
    return this.#call((callId) => ({
      type: TYPE_SET_INTERFACE,
      callId,
      apiMethods: Object.keys(api),
    })).then(() => undefined);
  }

  callRemoteMethod(methodName: string, ...args: unknown[]): Promise<unknown> {
    return this.#call((callId) => ({
      type: TYPE_MESSAGE,
      callId,
      methodName,
      arguments: args,
    }));
  }

  callRemoteServiceMethod(
    methodName: string,
    ...args: unknown[]
  ): Promise<unknown> {
    return this.#call((callId) => ({
      type: TYPE_SERVICE_MESSAGE,
      callId,
      methodName,
      arguments: args,
    }));
  }

  /** Routes outgoing messages to `post` and flushes the queued ones. */
  attach(post: Post) {
    if (this.#disposedReason) return;
    this.#post = post;
    const queued = this.#queue;
    this.#queue = [];
    for (const { message, callId } of queued) this.#send(message, callId);
  }

  /** Drops the transport and rejects pending and future calls. */
  dispose(reason: Error) {
    this.#disposedReason = reason;
    this.#post = null;
    this.#queue = [];
    const callbacks = [...this.#callbacks.values()];
    this.#callbacks.clear();
    for (const { reject } of callbacks) reject(reason);
  }

  handle(data: unknown) {
    if (typeof data !== "object" || data === null) return;
    const message = data as Partial<ConnectionMessage> & { callId?: unknown };
    if (typeof message.callId !== "string") return;
    const callId = message.callId;

    switch (message.type) {
      case TYPE_RESPONSE: {
        const pending = this.#callbacks.get(callId);
        if (!pending) return;
        this.#callbacks.delete(callId);
        if (message.success) pending.resolve(message.result);
        else pending.reject(deserializeError(message.result));
        return;
      }
      case TYPE_MESSAGE:
        this.#answer(
          callId,
          this.localApi,
          this.#exposed,
          message.methodName,
          message.arguments,
        );
        return;
      case TYPE_SERVICE_MESSAGE:
        this.#answer(
          callId,
          this.#serviceMethods,
          new Set(Object.keys(this.#serviceMethods)),
          message.methodName,
          message.arguments,
        );
        return;
      case TYPE_SET_INTERFACE: {
        const methods = Array.isArray(message.apiMethods)
          ? message.apiMethods.filter((m): m is string => typeof m === "string")
          : [];
        const remote: RemoteAPI = {};
        for (const method of methods) {
          defineOwn(remote, method, (...args: unknown[]) =>
            this.callRemoteMethod(method, ...args),
          );
        }
        this.remote = remote;
        this.#resolveRemoteMethods();
        this.#respond(callId, undefined, true);
        return;
      }
    }
  }

  #call(build: (callId: string) => ConnectionMessage): Promise<unknown> {
    if (this.#disposedReason) return Promise.reject(this.#disposedReason);
    return new Promise((resolve, reject) => {
      const callId = String(++this.#nextId);
      this.#callbacks.set(callId, { resolve, reject });
      const message = build(callId);
      if (this.#post) this.#send(message, callId);
      else this.#queue.push({ message, callId });
    });
  }

  #send(message: ConnectionMessage, callId: string) {
    try {
      this.#post!(message);
    } catch (error) {
      const pending = this.#callbacks.get(callId);
      this.#callbacks.delete(callId);
      pending?.reject(error);
    }
  }

  #answer(
    callId: string,
    table: API,
    exposed: ReadonlySet<string>,
    methodName: unknown,
    args: unknown,
  ) {
    new Promise<unknown>((resolve) => {
      if (typeof methodName !== "string" || !exposed.has(methodName)) {
        throw new Error(
          `Websandbox: method "${String(methodName)}" is not exposed`,
        );
      }
      const method = table[methodName];
      if (typeof method !== "function") {
        throw new Error(`Websandbox: "${methodName}" is not a function`);
      }
      resolve(method.apply(table, Array.isArray(args) ? args : []));
    }).then(
      (result) => this.#respond(callId, result, true),
      (error: unknown) => this.#respond(callId, error, false),
    );
  }

  #respond(callId: string, result: unknown, success: boolean) {
    const post = this.#post;
    if (!post) return;
    const payload = result instanceof Error ? serializeError(result) : result;
    try {
      post({ type: TYPE_RESPONSE, callId, success, result: payload });
      return;
    } catch (error) {
      if (!isDataCloneError(error)) return;
    }
    let fallback: ConnectionMessage;
    try {
      fallback = {
        type: TYPE_RESPONSE,
        callId,
        success,
        result: JSON.parse(JSON.stringify(payload)),
      };
    } catch {
      fallback = {
        type: TYPE_RESPONSE,
        callId,
        success: false,
        result: serializeError(
          new Error("Websandbox: the result could not be cloned"),
        ),
      };
    }
    try {
      post(fallback);
    } catch {
      // The other side cannot be told; its call stays pending.
    }
  }
}

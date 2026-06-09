import { deepApply, lookupState } from "./internal";
import type { DeepReadonly } from "./internal";

// --- Wire Protocol Operations ---

export type GorpOperation =
  | { type: "set"; path: string[]; value: unknown }
  | { type: "append-text"; path: string[]; value: string };

// --- Wire Protocol Envelope ---

/**
 * Wire envelope and also the shape every `subscribe` callback receives.
 * `ops` is the buffered state delta since the previous emit; `ack`, when
 * present, is the **cumulative** count of commands the inner has confirmed
 * processed (0-indexed: `ack: -1` means "none", `ack: 0` means "one done",
 * etc.). Idempotent — the same value can be re-received without harm.
 *
 * Different layers translate `ack` into the meaning that fits them:
 * - On the wire to a `GorpClient`, it's the per-client high-water seq the
 *   client splices its pending queue against.
 * - Inside a `GorpSessions` wrapper, the inner's cumulative `ack` is diffed
 *   against the last seen value to drain that many entries off the outgoing
 *   FIFO.
 */
export type GorpMessage = {
  ops: GorpOperation[];
  ack?: number;
};

/**
 * Wire helper: a `GorpMessage` that replaces the receiver's entire state with
 * `value` via a single root `set` op. Used by transports for the initial
 * snapshot on connect and by `GorpRelay.restore` to seed a fresh replica.
 */
export function snapshotMessage<T>(value: T): GorpMessage {
  return { ops: [{ type: "set", path: [], value }] };
}

// --- Append Text ---

const APPEND_TEXT = Symbol("appendText");

export function appendText(value: string): string {
  return { [APPEND_TEXT]: true, value } as unknown as string;
}

// --- Dev mode ---

/** True when bundlers haven't replaced NODE_ENV with "production". */
const DEV: boolean = (() => {
  try {
    return (
      typeof process === "undefined" || process.env?.NODE_ENV !== "production"
    );
  } catch {
    return true;
  }
})();

/** Hidden tag exposed by mutation proxies, used by the dev-mode guard in
 *  `proxy.set` to detect proxy values being stored back into state. */
const PROXY_MARKER = Symbol("gorpProxy");

// --- Replica ---

export class Gorp<T extends Record<string, unknown>> {
  private _state: DeepReadonly<T>;

  constructor(initialState: T | DeepReadonly<T>) {
    this._state = initialState as DeepReadonly<T>;
  }

  get state(): DeepReadonly<T> {
    return this._state;
  }

  apply(operations: GorpOperation[]): void {
    for (const op of operations) {
      this._state = deepApply(this._state, op.path, op) as DeepReadonly<T>;
    }
  }

  /**
   * Returns a long-lived mutable proxy for `T`. Every property write applies
   * the change to the underlying state and forwards the resulting op to
   * `onOp`. Reads always reflect the latest state. The same proxy can be
   * used for the lifetime of the `Gorp` — sub-proxies are created lazily on
   * traversal, so caching the root is fine.
   */
  draft(onOp: (op: GorpOperation) => void): T {
    return createMutationProxy(this, onOp) as T;
  }
}

// --- Mutation Proxy ---

/**
 * Walks `value` looking for a Gorp proxy (tagged with `PROXY_MARKER`).
 * Used by the dev-mode guard so `state.queue = arr.filter(...)` — which
 * returns a real Array of sub-proxies — fails loudly instead of silently
 * storing proxies into state and breaking subsequent reads with infinite
 * recursion. Only the top-level value is recursed; we stop as soon as a
 * proxy is found.
 */
function containsProxy(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  if ((value as { [PROXY_MARKER]?: boolean })[PROXY_MARKER]) return true;
  // From here on `value` is a non-proxy object/array — its own iteration
  // is safe (no extra proxy traps fire).
  if (Array.isArray(value)) {
    for (const item of value) {
      if (containsProxy(item)) return true;
    }
    return false;
  }
  for (const k of Object.keys(value)) {
    if (containsProxy((value as Record<string, unknown>)[k])) return true;
  }
  return false;
}

function createMutationProxy<T extends Record<string, unknown>>(
  replica: Gorp<T>,
  onOp: (op: GorpOperation) => void,
  path: string[] = [],
): unknown {
  // Live object at this path, or null when the path doesn't currently
  // resolve to one. Mirrored by `has` / `ownKeys` / `getOwnPropertyDescriptor`
  // so `Object.keys`, `in`, and spread see the actual state rather than the
  // empty proxy target.
  const live = (): object | null => {
    const c = lookupState(replica.state, path);
    return typeof c === "object" && c !== null ? c : null;
  };

  return new Proxy(Object.create(null), {
    get(_, key) {
      if (key === PROXY_MARKER) return true;
      // `JSON.stringify` honours `toJSON`. Without this, stringifying a proxy
      // serializes arrays as objects (`Array.isArray(proxy)` is false because
      // the target is a plain `Object.create(null)`), corrupting state
      // snapshots on the wire. Resolve to the plain underlying value instead.
      if (key === "toJSON") return () => lookupState(replica.state, path);
      if (typeof key === "symbol") return undefined;
      const childPath = [...path, key as string];
      const value = lookupState(replica.state, childPath);
      return typeof value === "object" && value !== null
        ? createMutationProxy(replica, onOp, childPath)
        : value;
    },
    set(_, key, value) {
      if (typeof key === "symbol") return false;
      const k = key as string;
      if (Array.isArray(live()) && (k === "length" || isNaN(Number(k)))) {
        // Setting `length` (or a non-numeric property) on an array is the
        // signature of a mutating array method (`push`, `pop`, `splice`, …).
        // Those don't generate a coherent op stream — block them and steer
        // the caller toward replacing the array with a plain value.
        throw new Error(
          `Cannot set "${k}" on a Gorp proxy array. Mutating array methods ` +
            "(push, pop, shift, unshift, splice, …) are not supported — " +
            "build a new array of plain values and assign it (e.g. " +
            "`state.list = [...state.list, x]`).",
        );
      }
      if (DEV && containsProxy(value)) {
        throw new Error(
          "Refusing to store a Gorp proxy back into state — it would cause " +
            "infinite recursion on subsequent reads. Spread the value " +
            "(`{...proxy}` / `[...arr].map(x => ({...x}))`) or use " +
            "`structuredClone` to convert it to a plain value first.",
        );
      }
      const newPath = [...path, k];
      const op: GorpOperation =
        value && typeof value === "object" && APPEND_TEXT in value
          ? {
              type: "append-text",
              path: newPath,
              value: (value as unknown as { value: string }).value,
            }
          : { type: "set", path: newPath, value };
      replica.apply([op]);
      onOp(op);
      return true;
    },
    has(_, key) {
      const c = live();
      return c !== null && key in c;
    },
    ownKeys() {
      const c = live();
      return c ? Reflect.ownKeys(c) : [];
    },
    getOwnPropertyDescriptor(_, key) {
      const c = live();
      const d = c ? Reflect.getOwnPropertyDescriptor(c, key) : undefined;
      return d ? { ...d, configurable: true } : undefined;
    },
  });
}

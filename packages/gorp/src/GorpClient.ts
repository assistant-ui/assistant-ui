import { Gorp } from "./Gorp";
import { assertSafePathSegment, lookupState } from "./internal";
import type { DeepReadonly } from "./internal";
import type { GorpMessage } from "./Gorp";

// ────────────────────────────────────────────────────────────
//  Change Tree
//
//  A nested object whose leaves are `true` ("anything at or below this
//  path matters"). Mutated in place — these helpers aren't safe to call
//  on shared structures.
// ────────────────────────────────────────────────────────────

/** @internal */
export type ChangeNode = true | { [key: string]: ChangeNode };

/**
 * Mark `path` (and everything below it) as changed in `node`. Mutates
 * `node` in place when it is an object and returns it; returns `true`
 * only when the mark covers the whole tree (`path.length === 0` or
 * `node === true`).
 * @internal
 */
export function markChanged(
  node: ChangeNode,
  path: readonly string[],
): ChangeNode {
  if (node === true || path.length === 0) return true;
  let cursor = node;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      throw new Error(`Unsafe gorp path segment: ${key}`);
    }
    const next = cursor[key];
    if (next === true) return node;
    if (next === undefined) cursor[key] = {};
    cursor = cursor[key] as { [k: string]: ChangeNode };
  }
  const leaf = path[path.length - 1]!;
  if (leaf === "__proto__" || leaf === "constructor" || leaf === "prototype") {
    throw new Error(`Unsafe gorp path segment: ${leaf}`);
  }
  cursor[leaf] = true;
  return node;
}

/**
 * Merge `source` into `target`, mutating `target` in place.
 * @internal
 */
export function mergeChanged(
  target: ChangeNode,
  source: ChangeNode,
): ChangeNode {
  if (target === true || source === true) return true;
  for (const key of Object.keys(source)) {
    assertSafePathSegment(key);
    const sChild = source[key]!;
    const tChild = target[key];
    target[key] =
      tChild === undefined
        ? cloneChangeNode(sChild)
        : mergeChanged(tChild, sChild);
  }
  return target;
}

function cloneChangeNode(source: ChangeNode): ChangeNode {
  if (source === true) return true;
  const clone: { [key: string]: ChangeNode } = {};
  for (const key of Object.keys(source)) {
    assertSafePathSegment(key);
    clone[key] = cloneChangeNode(source[key]!);
  }
  return clone;
}

/** @internal */
export function lookupChange(
  node: ChangeNode,
  path: readonly string[],
): ChangeNode | false {
  for (const key of path) {
    if (node === true) return true;
    const next = node[key];
    if (next === undefined) return false;
    node = next;
  }
  return node;
}

/**
 * Diff the keys of two object-like values. New keys first (in their order
 * in `newNode`), then removed keys in reverse (so children precede their
 * parents under recursive deletion).
 */
function diffKeys(newNode: unknown, oldNode: unknown): string[] {
  const newKeys =
    typeof newNode === "object" && newNode !== null ? Object.keys(newNode) : [];
  const oldKeys =
    typeof oldNode === "object" && oldNode !== null ? Object.keys(oldNode) : [];
  if (oldKeys.length === 0) return newKeys;
  const newSet = new Set(newKeys);
  const deletedKeys = oldKeys.filter((k) => !newSet.has(k)).reverse();
  return [...newKeys, ...deletedKeys];
}

// ────────────────────────────────────────────────────────────
//  GorpClient
// ────────────────────────────────────────────────────────────

/**
 * A two-layer Gorp that maintains an authoritative "committed" state and an
 * "optimistic" view derived from `committed + replay(pending commands)`.
 *
 * Wire flow:
 *  - Server pushes envelopes via `apply({ ops, ack })`. `ops` updates the
 *    committed layer; `ack`, when present, is the high-water seq the server
 *    has processed for this session — every pending entry whose seq is at or
 *    below `ack` is spliced. Idempotent, so the same `ack` value is safe to
 *    receive multiple times (matters for reconnects).
 *  - Local code calls `send(cmd)` to enqueue a command and run its optimistic
 *    mutator immediately. Each command is assigned an implicit, monotonically
 *    increasing seq — never sent on the wire alongside the command, but
 *    derivable: pending[i] has seq `firstPendingSeq + i`. On reconnect the
 *    transport hands `firstPendingSeq` to the server once (handshake) and
 *    then re-sends every command in `pending` in order; the server tracks
 *    per-client incoming seq from there and dedups against its session
 *    high-water.
 *
 * After any of these operations, `getChangedKeys(path)` reports the union of:
 *   (1) keys actually moved by the new ops/mutator,
 *   (2) keys previously dirtied by pending optimistic mutations (which may
 *       now be reverted by a rebuild — the consumer must re-read them).
 */
export class GorpClient<T extends Record<string, unknown>, C> {
  private readonly mutator: (state: T, command: C, seq: number) => void;
  private readonly _send: (command: C) => void;
  private committed: Gorp<T>;
  private optimistic: Gorp<T>;
  private _pending: C[] = [];
  private _nextSeq = 0;
  private readonly changeListeners = new Set<() => void>();

  // Diff frame: change set + state snapshot since the last public method
  // call. Reset by `beginFrame()` at the top of every `apply` / `send`.
  private changes: ChangeNode = {};
  private previousState: DeepReadonly<T>;

  // Paths currently held dirty by pending optimistic mutations across the
  // queue's lifetime. On rebuild, folded into `changes` so the consumer is
  // told to re-read those paths (their values may have been reverted).
  private optimisticDirty: ChangeNode = {};

  constructor(config: GorpClient.Config<T, C>) {
    this.mutator = config.mutator;
    this._send = config.send;
    this.committed = new Gorp<T>(config.initialState);
    this.optimistic = new Gorp<T>(config.initialState);
    this.previousState = this.optimistic.state;
  }

  // ─── Read ───────────────────────────────────────────────

  get state(): DeepReadonly<T> {
    return this.optimistic.state;
  }

  /** @internal Pending commands in send order. Used by tests + transports. */
  get pending(): readonly C[] {
    return this._pending;
  }

  /**
   * Seq of `pending[0]` (the next pending command the server should see).
   * Transports send this with the connection handshake so the server can
   * resume its incoming seq counter and dedup against the session high-water.
   */
  get firstPendingSeq(): number {
    return this._nextSeq - this._pending.length;
  }

  // ─── Mutate ─────────────────────────────────────────────

  apply({ ops, ack }: GorpMessage): void {
    this.beginFrame();

    for (const op of ops) {
      this.changes = markChanged(this.changes, op.path);
    }

    this.committed.apply(ops);
    if (ack !== undefined) {
      const firstPendingSeq = this._nextSeq - this._pending.length;
      const spliceCount = ack - firstPendingSeq + 1;
      if (spliceCount > 0) {
        this._pending.splice(0, Math.min(spliceCount, this._pending.length));
      }
    }

    this.rebuildOptimistic();
    for (const listener of this.changeListeners) listener();
  }

  send(command: C): void {
    this.beginFrame();
    const seq = this._nextSeq++;
    this._pending.push(command);
    this.replayMutator(command, seq);
    this._send(command);
    for (const listener of this.changeListeners) listener();
  }

  // ─── Transport hooks ────────────────────────────────────

  /**
   * Subscribe to state changes. Fires after every `apply` / `send`, regardless
   * of whether anything actually moved — consumers should gate on
   * `getChangedKeys()` if a no-op frame should be skipped.
   */
  onChange(callback: () => void): () => void {
    this.changeListeners.add(callback);
    return () => {
      this.changeListeners.delete(callback);
    };
  }

  /**
   * Re-fire every pending command through `config.send`, in order. Transports
   * call this on (re)connect so the server can dedup against the session
   * high-water — the URL handshake's `fromSeq` covers the protocol side,
   * this covers the wire side.
   */
  resync(): void {
    for (const command of this._pending) this._send(command);
  }

  // ─── Query change set ───────────────────────────────────

  isChangedAt(path: string[]): boolean {
    return !!lookupChange(this.changes, path);
  }

  getChangedKeys(path: string[]): string[] {
    const node = lookupChange(this.changes, path);
    if (node === false) return [];
    if (node === true) {
      return diffKeys(
        lookupState(this.optimistic.state, path),
        lookupState(this.previousState, path),
      );
    }
    return Object.keys(node);
  }

  // ─── Internals ──────────────────────────────────────────

  /** Open a new diff frame. Called at the top of every public mutation. */
  private beginFrame(): void {
    this.previousState = this.optimistic.state;
    this.changes = {};
  }

  /** Run the mutator for a command and record its touched paths. */
  private replayMutator(command: C, seq: number): void {
    const draft = this.optimistic.draft((op) => {
      this.changes = markChanged(this.changes, op.path);
      this.optimisticDirty = markChanged(this.optimisticDirty, op.path);
    });
    this.mutator(draft, command, seq);
  }

  /** Reclone optimistic from committed and replay every pending mutator. */
  private rebuildOptimistic(): void {
    // Paths previously held dirty may now be reverted; mark them changed.
    this.changes = mergeChanged(this.changes, this.optimisticDirty);
    this.optimisticDirty = {};

    this.optimistic = new Gorp<T>(this.committed.state);
    const firstPending = this._nextSeq - this._pending.length;
    for (let i = 0; i < this._pending.length; i++) {
      this.replayMutator(this._pending[i]!, firstPending + i);
    }
  }
}

export namespace GorpClient {
  /**
   * Constructor config for `GorpClient`. `mutator` runs once per `send` and
   * again on every replay against fresh committed state, so it must be
   * deterministic in `(state, command, seq)`. `send` is the transport
   * callback gorp invokes for every outbound command (and re-invokes for
   * each pending entry on `resync`).
   */
  export type Config<T extends Record<string, unknown>, C> = {
    initialState: T;
    mutator: (state: T, command: C, seq: number) => void;
    send: (command: C) => void;
  };
}

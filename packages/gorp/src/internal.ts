import type { GorpMessage, GorpOperation } from "./Gorp";

/**
 * Coalesces ops + a cumulative ack counter into per-microtask `subscribe`
 * envelopes. `GorpServer` uses this because a single `receive(cmd)` whose
 * handler does many proxy writes would otherwise fire one subscriber
 * callback per write. `GorpRelay` doesn't — its `applyUpstream` is already
 * a coalesced flush boundary upstream, so it emits synchronously.
 * @internal
 */
export class Flusher {
  private pendingOps: GorpOperation[] = [];
  private ack = -1;
  private lastEmittedAck = -1;
  private readonly subscribers = new Set<(env: GorpMessage) => void>();
  private scheduled = false;

  enqueueOp(op: GorpOperation): void {
    this.pendingOps.push(op);
    this.schedule();
  }

  /** Bump the cumulative ack by 1 (called per `GorpServer.receive`). */
  bumpAck(): void {
    this.ack += 1;
    this.schedule();
  }

  subscribe(callback: (env: GorpMessage) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.flush();
    });
  }

  private flush(): void {
    const ops = this.pendingOps;
    const ack = this.ack;
    this.pendingOps = [];
    if (ops.length === 0 && ack === this.lastEmittedAck) return;
    this.lastEmittedAck = ack;
    const env: GorpMessage = { ops };
    if (ack >= 0) env.ack = ack;
    for (const sub of this.subscribers) sub(env);
  }
}

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

export function lookupState(state: unknown, path: string[]): unknown {
  let node = state;
  for (const key of path) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

export function deepApply(
  target: unknown,
  path: string[],
  op: GorpOperation,
): unknown {
  if (path.length === 0) {
    if (op.type === "set") return op.value;
    if (op.type === "append-text") return String(target ?? "") + op.value;
    return target;
  }

  const [head, ...rest] = path;

  if (Array.isArray(target)) {
    const index = Number(head);
    const copy = [...target];
    copy[index] = deepApply(copy[index], rest, op);
    return copy;
  }

  const obj =
    typeof target === "object" && target !== null
      ? (target as Record<string, unknown>)
      : {};

  return {
    ...obj,
    [head!]: deepApply(obj[head!], rest, op),
  };
}

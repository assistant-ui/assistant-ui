import { Gorp, snapshotMessage } from "./Gorp";
import type { GorpMessage } from "./Gorp";
import type { DeepReadonly } from "./internal";

/** Snapshot returned by `serialize()`. Round-trip via `restore()`. */
export type RelaySerializedState<T> = {
  state: T;
};

/**
 * State mirror + upstream pipe. Acts as a pass-through between an upstream
 * `GorpServer` connection and a downstream `GorpSessions` wrapper: forwards
 * commands via `send` and republishes inbound `GorpMessage` envelopes to
 * subscribers verbatim.
 *
 * Assumes the upstream connection is stable across hibernation (CF Durable
 * Objects with hibernation-aware sockets buffer messages while idle, so on
 * wake the relay can resume without an explicit handshake). No upstream
 * sessionId, no `fromSeq`, no in-flight queue. The cumulative `ack` from
 * upstream is forwarded directly; the wrapper computes the delta.
 */
export class GorpRelay<T extends Record<string, unknown>, C> {
  private readonly gorp: Gorp<T>;
  private readonly _send: (command: C) => void;
  private readonly subscribers = new Set<(env: GorpMessage) => void>();

  constructor(config: GorpRelay.Config<T, C>) {
    this.gorp = new Gorp<T>(config.initialState);
    this._send = config.send;
  }

  /** Mirror of upstream state. Read-only. */
  get state(): DeepReadonly<T> {
    return this.gorp.state;
  }

  /** Forward a command upstream. */
  receive(command: C): void {
    this._send(command);
  }

  /**
   * Apply a `GorpMessage` from upstream — update the mirror and forward to
   * subscribers verbatim. Emits synchronously (no microtask delay).
   */
  applyUpstream(msg: GorpMessage): void {
    if (msg.ops.length === 0 && msg.ack === undefined) return;
    if (msg.ops.length > 0) this.gorp.apply(msg.ops);
    for (const sub of this.subscribers) sub(msg);
  }

  subscribe(callback: (env: GorpMessage) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  serialize(): RelaySerializedState<T> {
    return { state: this.gorp.state as T };
  }

  restore(serialized: RelaySerializedState<T>): void {
    this.gorp.apply(snapshotMessage(serialized.state).ops);
  }
}

export namespace GorpRelay {
  /**
   * Constructor config for `GorpRelay`. No mutator — state changes come from
   * upstream `GorpMessage`s applied via `applyUpstream`. `send` is the
   * upstream transport callback the relay invokes for every command it
   * forwards.
   */
  export type Config<T extends Record<string, unknown>, C> = {
    initialState: T;
    send: (command: C) => void;
  };
}

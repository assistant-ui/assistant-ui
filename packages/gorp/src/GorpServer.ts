import { Gorp } from "./Gorp";
import type { GorpMessage, GorpOperation } from "./Gorp";
import { Flusher } from "./internal";

/**
 * Authoritative replica that owns one `T`. Writes through the live `state`
 * proxy queue ops; calling `receive(cmd)` runs the constructor-provided
 * command handler and bumps the cumulative ack counter. Subscribers see
 * batched `ops` plus the current cumulative `ack` on each microtask flush.
 *
 * The handler is intentionally *acked on receipt* — the bump happens right
 * after `commandHandler` returns, regardless of whether the handler started
 * async work. This keeps the in-flight queue at the wrapper layer empty
 * almost immediately so DOs can hibernate cleanly.
 *
 * No sessions, no per-client tracking. Pair with `GorpSessions` for that.
 */
export class GorpServer<T extends Record<string, unknown>, C> {
  private readonly gorp: Gorp<T>;
  private readonly commandHandler: (command: C) => void;
  private readonly flusher = new Flusher();
  private readonly _state: T;

  constructor(initialState: T, commandHandler: (command: C) => void) {
    this.gorp = new Gorp<T>(initialState);
    this.commandHandler = commandHandler;
    this._state = this.gorp.draft((op) => this.flusher.enqueueOp(op));
  }

  /** Live mutable proxy. Reads return current values; writes queue ops. */
  get state(): T {
    return this._state;
  }

  /** Root replace — emits a single `set []` op. */
  set state(value: T) {
    const op: GorpOperation = { type: "set", path: [], value };
    this.gorp.apply([op]);
    this.flusher.enqueueOp(op);
  }

  /**
   * Process a command. Runs the handler synchronously; any state writes the
   * handler makes accumulate into the same flush as the ack bump.
   */
  receive(command: C): void {
    this.commandHandler(command);
    this.flusher.bumpAck();
  }

  subscribe(callback: (env: GorpMessage) => void): () => void {
    return this.flusher.subscribe(callback);
  }
}

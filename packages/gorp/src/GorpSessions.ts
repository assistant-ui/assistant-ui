import { snapshotMessage } from "./Gorp";
import type { GorpMessage } from "./Gorp";

/** Hardcoded TTL for downstream sessions; pruned after this much inactivity. */
const SESSION_TTL_MS = 60 * 60 * 1000;

/**
 * The structural interface `GorpSessions` needs from its inner. Both
 * `GorpServer` and `GorpRelay` satisfy it.
 */
interface GorpPubsub<C> {
  readonly state: unknown;
  receive(command: C): void;
  subscribe(callback: (env: GorpMessage) => void): () => void;
}

/** Per-session state exposed via the `sessions` getter. */
type GorpSession = {
  /** Highest browser-seq the inner has confirmed processed. */
  highWater: number;
  /** Wall-clock ms of last activity, used for TTL pruning. */
  lastActivity: number;
};

/**
 * Snapshot returned by `serialize()`. Round-trip via `restore()`. Only
 * per-session high-waters are persisted; the in-flight `outgoing` FIFO is
 * expected to be empty at hibernation time (the inner acks on receipt, so
 * the FIFO drains synchronously enough that DOs hibernate idle).
 */
export type GorpSessionsState = {
  sessions: Record<string, { highWater: number }>;
};

type SessionInternal = {
  highWater: number;
  lastActivity: number;
  /** Highest browser-seq forwarded to inner (across all connections). */
  lastForwardedSeq: number;
};

type ClientEntry = {
  sessionId: string;
  send: (msg: GorpMessage) => void;
  /** Seq the next `receive(cmd)` from this connection should be assigned. */
  incomingSeq: number;
  /** Last `ack` we sent to this client; suppresses no-op flushes. */
  lastSentAck: number;
};

type OutgoingEntry = {
  sessionId: string;
  browserSeq: number;
};

/**
 * Wraps a `GorpPubsub` (either `GorpServer` or `GorpRelay`) to give it a
 * sessioned wire protocol: per-`sessionId` dedup, per-client `ack`
 * flushing, and the routing FIFO that turns the inner's cumulative ack
 * back into per-session high-water advances.
 *
 * Cumulative `ack` semantics: each subscribe envelope from the inner
 * carries `ack` (the inner's cumulative count of commands processed). The
 * wrapper computes `delta = env.ack - _lastSeenAck` and drains that many
 * entries off the outgoing FIFO. Same shape for both inner types — the
 * delta math is identical regardless of whether `ack` came from
 * `GorpServer.receive` bumping a local counter or `GorpRelay.applyUpstream`
 * forwarding a number from upstream.
 *
 * `_lastSeenAck` is **not** persisted: the inner is expected to ack on
 * receipt, so at hibernation time the outgoing FIFO is empty. On wake the
 * first post-wake envelope yields a large delta against the default
 * `_lastSeenAck = -1`, but the splice auto-clamps at `outgoing.length = 0`
 * and the math self-corrects from there.
 */
export class GorpSessions<C> {
  private readonly inner: GorpPubsub<C>;
  private readonly _sessions = new Map<string, SessionInternal>();
  private readonly clients = new Set<ClientEntry>();
  private outgoing: OutgoingEntry[] = [];
  private lastSeenAck = -1;
  private readonly unsubscribe: () => void;

  constructor(inner: GorpPubsub<C>) {
    this.inner = inner;
    this.unsubscribe = inner.subscribe((env) => this.fanOut(env));
  }

  /** Per-session view for inspection. */
  get sessions(): ReadonlyMap<string, GorpSession> {
    const out = new Map<string, GorpSession>();
    for (const [id, s] of this._sessions) {
      out.set(id, { highWater: s.highWater, lastActivity: s.lastActivity });
    }
    return out;
  }

  /**
   * Attach a client. The first envelope is the initial snapshot of inner
   * state; if the session has prior history, the snapshot also carries
   * `ack: session.highWater` so a reconnecting client splices any
   * already-acked pending without a round-trip.
   */
  addClient(
    sessionId: string,
    fromSeq: number,
    send: (msg: GorpMessage) => void,
  ): GorpSessions.ClientHandle<C> {
    this.pruneSessions();

    let session = this._sessions.get(sessionId);
    if (!session) {
      session = {
        highWater: -1,
        lastActivity: Date.now(),
        lastForwardedSeq: -1,
      };
      this._sessions.set(sessionId, session);
    } else {
      session.lastActivity = Date.now();
    }

    const entry: ClientEntry = {
      sessionId,
      send,
      incomingSeq: fromSeq,
      lastSentAck: -1,
    };
    this.clients.add(entry);

    const initial: GorpMessage = snapshotMessage(this.inner.state);
    if (session.highWater >= 0) initial.ack = session.highWater;
    send(initial);
    entry.lastSentAck = session.highWater;

    return {
      receive: (command: C) => {
        const s = this._sessions.get(sessionId);
        if (!s) return;
        const seq = entry.incomingSeq++;
        s.lastActivity = Date.now();
        if (seq <= s.lastForwardedSeq) return; // dedup
        s.lastForwardedSeq = seq;
        this.outgoing.push({ sessionId, browserSeq: seq });
        this.inner.receive(command);
      },
      remove: () => {
        this.clients.delete(entry);
      },
    };
  }

  /** Detach all clients. Sessions persist (subject to TTL). */
  close(): void {
    this.clients.clear();
    this.unsubscribe();
  }

  serialize(): GorpSessionsState {
    const sessions: Record<string, { highWater: number }> = {};
    for (const [id, s] of this._sessions) {
      sessions[id] = { highWater: s.highWater };
    }
    return { sessions };
  }

  /**
   * Restore sessions. Call before any `addClient`. `lastForwardedSeq` is
   * rebuilt from `highWater` — they're equal at hibernation time because
   * the inner has acked everything in-flight by then.
   */
  restore(state: GorpSessionsState): void {
    this._sessions.clear();
    for (const [id, s] of Object.entries(state.sessions)) {
      this._sessions.set(id, {
        highWater: s.highWater,
        lastActivity: Date.now(),
        lastForwardedSeq: s.highWater,
      });
    }
  }

  private fanOut(env: GorpMessage): void {
    if (env.ack !== undefined && env.ack > this.lastSeenAck) {
      const delta = env.ack - this.lastSeenAck;
      this.lastSeenAck = env.ack;
      // `splice(0, delta)` auto-clamps at `outgoing.length`, so over-large
      // deltas (e.g. first post-wake envelope against `_lastSeenAck = -1`)
      // are harmless.
      const drained = this.outgoing.splice(0, delta);
      for (const e of drained) {
        const s = this._sessions.get(e.sessionId);
        if (s && e.browserSeq > s.highWater) s.highWater = e.browserSeq;
      }
    }
    for (const entry of this.clients) {
      const session = this._sessions.get(entry.sessionId);
      if (!session) continue;
      const ack = session.highWater;
      const ackChanged = ack !== entry.lastSentAck && ack >= 0;
      if (env.ops.length === 0 && !ackChanged) continue;
      const msg: GorpMessage = { ops: env.ops };
      if (ackChanged) {
        msg.ack = ack;
        entry.lastSentAck = ack;
      }
      entry.send(msg);
    }
  }

  private pruneSessions(): void {
    const cutoff = Date.now() - SESSION_TTL_MS;
    const active = new Set<string>();
    for (const c of this.clients) active.add(c.sessionId);
    for (const [id, s] of this._sessions) {
      if (active.has(id)) continue;
      if (s.lastActivity < cutoff) this._sessions.delete(id);
    }
  }
}

export namespace GorpSessions {
  export interface ClientHandle<C> {
    receive(command: C): void;
    remove(): void;
  }
}

# gorp

A small state-sync primitive. Three core classes:

- **`GorpClient`** — leaf-side replica with an optimistic view layered on top
  of the latest server-confirmed state.
- **`GorpServer`** — authoritative state container + command handler + op
  fan-out. No sessions; no dedup. Pure pubsub.
- **`GorpRelay`** — state mirror + upstream pipe. Same shape as `GorpServer`
  from the outside (state + receive + subscribe), but driven by upstream
  `GorpMessage`s instead of a local handler.

Plus one layer that turns either into a sessioned wire protocol:

- **`GorpSessions`** — wraps a `GorpServer` or `GorpRelay`. Owns per-`sessionId`
  dedup, per-client `ack` flushing, and the in-flight FIFO that routes the
  inner's "I processed N more commands" signal back to the right sessions.

Wire protocol:

- **Server → Client** is `GorpMessage = { ops, ack? }`. `ops` is a deep patch
  list; `ack` is the per-session high-water seq the inner has processed.
  Idempotent — receiving the same `ack` twice is harmless.
- **Client → Server** is one command at a time. Sequence numbers are
  *implicit* (positional); the connection handshake conveys `sessionId` and
  `fromSeq` (the seq of the next command in the client's pending queue) so
  the session wrapper can dedup replays after a reconnect.
- **Initial snapshot**: every connection assumes the client starts with no
  server-confirmed state. The server's first message on each connection is
  a `set [] <full state>` op, optionally accompanied by an `ack` covering
  pending the session has already processed.

---

## `GorpClient<T, C>`

Maintains a `committed` replica that follows the server, and an `optimistic`
view that equals `committed + replay(pending)`. Every public mutation opens
a new diff frame; consumers query `isChangedAt` / `getChangedKeys`
synchronously after `apply()` or `send()` to learn what moved.

```ts
new GorpClient<T, C>(config: GorpClient.Config<T, C>)

namespace GorpClient {
  type Config<T, C> = {
    initialState: T;
    mutator: (state: T, command: C, seq: number) => void;
    send: (command: C) => void;
  };
}

client.state: DeepReadonly<T>
client.pending: readonly C[]
client.firstPendingSeq: number
client.send(command: C): void
client.apply(message: GorpMessage): void
client.resync(): void
client.onChange(cb: () => void): () => void
client.isChangedAt(path: string[]): boolean
client.getChangedKeys(path: string[]): string[]
```

`mutator` has the same `(state, command, seq) => void` shape `GorpServer`
takes, so both sides can share a single function definition. It runs once
per `send` and again on every replay against fresh committed state —
must be deterministic. `seq` is stable across replays — derive any
optimistic ids from it.

`send` is the outbound transport callback. Gorp invokes it for every
`send(cmd)` call and re-invokes it for each pending entry on `resync()`.

---

## `GorpServer<T, C>`

Authoritative state container. No sessions. Pair with `GorpSessions` if you
want the sessioned wire protocol.

```ts
new GorpServer<T, C>(config: GorpServer.Config<T, C>)

namespace GorpServer {
  type Config<T, C> = {
    initialState: T;
    mutator: (state: T, command: C, seq: number) => void;
  };
}

server.state: T                                      // live mutable proxy
server.state = newValue                              // root replace
server.receive(command: C): void                     // run the mutator
server.subscribe(cb: (env: GorpMessage) => void): () => void
```

`mutator`'s signature matches `GorpClient` — the `state` arg is the same
live proxy as `server.state`, and `seq` is a per-server monotonic counter
that increments on every `receive`. Server mutators never replay, so
`seq` here is just an id; it's not meaningful the way the client's
replay-stable seq is.

`state` is a live mutable proxy. Property writes queue ops (batched per
microtask); assigning to `state` itself emits a single `set [] value` op.
Mutating array methods (`push`, `pop`, `splice`, …) throw — use
`state.list = [...state.list, x]`. In dev (`NODE_ENV !== "production"`) the
proxy also throws if you try to assign a value that contains a Gorp proxy
(catches the silent infinite-recursion trap when a `state.queue =
arr.filter(...)` would have stored sub-proxies).

`subscribe` fires once per microtask flush with the buffered `ops` and a
cumulative `ack` count (0-indexed: `ack: -1` means "no commands done yet",
`ack: 0` means "one done"). For `GorpServer`, `ack` bumps by 1 on each
`receive` — the handler runs synchronously, ops + ack land in the same
envelope. Used by `GorpSessions` to drain its in-flight FIFO; standalone
consumers can ignore it.

---

## `GorpRelay<T, C>`

State mirror + upstream pipe. Same `state`/`receive`/`subscribe` surface as
`GorpServer`, but state changes come from upstream `GorpMessage` envelopes
rather than a local handler. Pure pass-through — no in-flight tracking, no
resume protocol.

```ts
new GorpRelay<T, C>(config: GorpRelay.Config<T, C>)

namespace GorpRelay {
  type Config<T, C> = {
    initialState: T;
    send: (command: C) => void;       // upstream transport callback
  };
}

relay.state: DeepReadonly<T>
relay.receive(command: C): void                      // forward upstream via config.send
relay.applyUpstream(msg: GorpMessage): void          // inbound from upstream
relay.subscribe(cb: (env: GorpMessage) => void): () => void

relay.serialize(): RelaySerializedState<T>           // { state }
relay.restore(state: RelaySerializedState<T>): void
```

`receive` just forwards via `config.send`. `applyUpstream` applies ops
into the mirror and republishes the envelope to subscribers verbatim
(synchronously — no microtask delay). `ack` flows through as-is; the
wrapping `GorpSessions` interprets it.

**Assumption**: the upstream connection (DO↔Sandbox in the harness) is
stable across DO hibernation. CF Durable Objects with hibernation-aware
sockets buffer messages while idle, so on wake the relay resumes without
an explicit handshake. If the connection ever drops for real, in-flight
commands are lost — application-level idempotency is the recovery story.

---

## `GorpSessions<C>`

Wraps either a `GorpServer` or `GorpRelay` and adds the sessioned wire
protocol.

```ts
new GorpSessions<C>(inner: GorpServer<T, C> | GorpRelay<T, C>)

sessions.addClient(
  sessionId: string,
  fromSeq: number,
  send: (msg: GorpMessage) => void,
): { receive(command: C): void; remove(): void }

sessions.sessions: ReadonlyMap<string, GorpSession>  // inspection
sessions.close(): void
sessions.serialize(): GorpSessionsState
sessions.restore(state: GorpSessionsState): void
```

On `addClient`, the wrapper:

1. Touches/creates the per-`sessionId` entry (`{ highWater, lastActivity }`).
2. Sends an initial envelope — `{ ops: [{ set [] state }], ack? }` — so a
   reconnecting client splices any already-processed pending without a
   round-trip.

On `handle.receive(cmd)`, the wrapper:

1. Assigns the implicit seq from the per-connection counter.
2. Dedups against `lastForwardedSeq`. If new, pushes
   `{ sessionId, browserSeq }` onto its in-flight FIFO and calls
   `inner.receive(cmd)`.

On the inner's `subscribe` callback, the wrapper:

1. Computes `delta = env.ack − _lastSeenAck` (where `_lastSeenAck`
   defaults to `-1`).
2. Drains `delta` entries off the front of the FIFO, advancing each
   drained session's `highWater` to its `browserSeq`. (`splice(0, delta)`
   auto-clamps, so an over-large delta against an empty FIFO is a no-op.)
3. Fans out `ops` to every connected client, attaching the latest
   `session.highWater` as `ack` if it advanced since the previous flush.

Persistence: `serialize` returns just `{ sessions }`. `outgoing` is *not*
persisted — the inner is expected to ack on receipt (`GorpServer.receive`
bumps the ack synchronously), so the FIFO drains fast enough that DOs
hibernate idle. `_lastSeenAck` isn't persisted either; on wake it
defaults to `-1` and the first envelope's clamped splice corrects the
math.

Sessions are retained for 1 hour after their last activity; active
(currently-connected) sessions are never pruned.

---

## `appendText`

Marker for the `append-text` op type, for streaming text concatenation
without retransmitting prior content.

```ts
server.state.messages[id].parts[0].text = appendText(chunk);
```

Works inside `GorpClient`'s optimistic mutator too.

---

## `GorpMessage`

```ts
type GorpMessage = {
  ops: GorpOperation[];
  ack?: number;
};
```

Server-to-client envelope. Apps don't construct these by hand — they fall
out of `GorpServer` / `GorpRelay` subscribers (typically wrapped by
`GorpSessions`).

---

## Reconnection contract

Client transport responsibilities:

1. Stable `sessionId` for the lifetime of the app instance.
2. `?sessionId=…&fromSeq=…` on the WS handshake. `fromSeq` is
   `client.firstPendingSeq` at the moment of the handshake — query fresh
   on each (re)connect attempt.
3. After `open`, re-send every command in `client.pending` in order.
   Duplicates dedup at the server's `GorpSessions` wrapper.

Server-side: persist `relay.serialize()` (or just `sessions.serialize()`
for a non-relay server) before hibernation; restore on wake. If you're
wrapping a `GorpRelay`, persist both blobs together so the upstream
pending queue and the wrapper's `outgoing` FIFO stay in lockstep.

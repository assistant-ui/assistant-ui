# gorp testing plan

The reference document for what gets tested and why. Each entry is a
**scenario**, not a function name; tests must map 1:1 to a scenario, and
new scenarios should land here before the test does.

## Goals

- Cover code paths whose breakage produces *observable* bugs in consumers
  (wrong UI, dropped commands, double-process on reconnect).
- Pin invariants the implementation relies on but doesn't enforce locally
  (mutator determinism, ack idempotence, frame-scoped change diffs).
- Use minimal fixtures. A test should read end-to-end without jumping to a
  helper file.

## Anti-goals

These are explicitly *not* worth writing:

1. "Function exists / returns truthy / has correct type" tests — the type
   system already covers these.
2. Exhaustive matrix tests where the matrix isn't tied to a real failure
   mode (e.g. testing `markChanged` with every depth from 1 to 10).
3. Mocking the proxy, the microtask scheduler, or `Date.now`. If a scenario
   needs control over timing or ordering, restructure the test, don't fake
   the runtime.
4. Snapshot tests of state objects. Asserting structure verbosely is fine;
   diffing serialised blobs hides what we actually care about.
5. Tests that re-prove what TypeScript already proves (parameter shapes,
   return types).
6. "Trivial wrapper" tests for thin pass-throughs (e.g. testing that
   `client.state` returns `optimistic.state`). If the wrapper has no logic,
   skip it; the integration tests will catch a regression.

---

## `tests/change-tree.test.ts`

The `markChanged` / `mergeChanged` / `lookupChange` helpers in
`GorpClient.ts`. These mutate in place and have early-return invariants
that are easy to break silently (under-marking is invisible).

- **Mark at `[]` collapses to `true`.** Empty path means "the whole tree
  changed"; the mark must be the sentinel, not an empty object.
- **Mark at `[a]` then `[a, b]` keeps `[a]` as `true`.** Once a path is
  blanket-marked, descending into it must be a no-op — otherwise we lose
  the "everything below" semantics.
- **Mark at `[a, b]` then `[a]` overwrites the subtree with `true`.** Going
  the other direction must replace the existing nested object with the
  sentinel.
- **Mark creates intermediate nodes lazily.** Marking `[a, b, c]` from `{}`
  must build `{ a: { b: { c: true } } }` without trampling siblings if `a`
  already exists.
- **`mergeChanged` with `true` on either side returns `true`.** Sentinel
  always wins.
- **`mergeChanged` with overlapping subtrees deep-merges.** Siblings
  preserved, overlapping leaves combined, no aliasing of source children
  back into target after the merge.
- **`lookupChange` past a `true` node returns `true`.** Once we've walked
  into a sentinel, every deeper path is also marked.
- **`lookupChange` for a path with no entry returns `false`.** Distinct
  from "marked with empty subtree".

## `tests/deepApply.test.ts`

`deepApply` and `lookupState` in `internal.ts`. The engine of every state
transition — both `Gorp.apply` and the proxy's `set` go through here.

- **Set at root returns the value verbatim.** `set [] X` replaces the
  entire tree with `X`.
- **Set on a missing intermediate auto-creates it.** `set [a, b] = X` on
  `{}` returns `{ a: { b: X } }`.
- **Set preserves siblings.** Setting `a.b` on `{ a: { c: 1 }, d: 2 }`
  must not drop `c` or `d`.
- **Set on an array index preserves length and other indices.** Numeric
  segments resolve to array slots; non-touched indices survive.
- **Append-text on a missing path treats the prior value as empty.**
  `append-text [a]` on `{}` returns `{ a: "<value>" }` (per the
  `String(target ?? "")` cast).
- **Append-text on an existing string concatenates.** No interleaving, no
  array conversion.
- **Input is never mutated.** `deepApply` is structural-share; the original
  object passed in must equal its prior shape afterward.
- **`lookupState` returns `undefined` for paths that walk through `null`
  or a primitive.** The traversal must be defensive.

## `tests/proxy.test.ts`

The mutation proxy in `Gorp.ts` (`Gorp.mutate(fn)`).

- **Deep set produces a single `set` op at the deep path.** `state.a.b.c = X`
  → `{ type: "set", path: ["a","b","c"], value: X }`.
- **`appendText(...)` produces an `append-text` op, not `set`.** The marker
  must round-trip through the proxy.
- **Array index write uses the numeric segment as path.** `arr[0] = X` →
  path `["arr", "0"]` (string form).
- **`length` read on a proxy-returned array returns the live length.**
  Used by `arr[arr.length] = …` push pattern.
- **`Object.keys(state.x)` returns the live keys.** `ownKeys` must mirror
  the underlying state, not the empty proxy target.
- **`'foo' in state.x` returns the live presence.** Same reason.
- **Reading a non-numeric / non-`length` key on an array proxy throws.**
  `arr.find(...)` should fail loudly with the array-method guard.
- **Reading an existing numeric index doesn't trigger the array-method
  guard.** `arr[0]` must succeed even though it's "not a method".
- **Sub-proxy reads compose.** `state.a.b.c` walks through two sub-proxies
  before the leaf and returns the actual value.
- **Symbol-keyed get returns `undefined`.** No iteration support; spreading
  a proxy-returned array would fail predictably.

## `tests/GorpClient.test.ts`

The change-tracking and pending/ack semantics. **Highest-risk file** —
this is where the suspected bug likely lives.

For all tests: `GorpClient<T, C>` is constructed with a tiny T (e.g.
`{ counter: number; items: Record<string, { name: string }> }`) and a
mutator that lets us write deterministic assertions.

- **`send` writes appear in `getChangedKeys` for the same frame.** Single
  command's writes are visible to the consumer immediately after `send`.
- **`apply({ ops })` with no ack: committed advances; pending intact;
  optimistic = committed + replay(pending).** Server pushed state but
  hasn't acked anything yet.
- **`apply({ ops, ack })` covering all pending: optimistic equals
  committed.** Pending drains, replays don't run, optimistic state is
  exactly the committed state.
- **`apply({ ops, ack })` covering some pending: pending splices to
  remaining; optimistic correctly reflects committed + remaining replays.**
  Mid-stream ack.
- **Replay of a remaining pending command after committed advances
  produces ops against the new committed state.** The mutator may produce
  *different* writes if its inputs changed; we test that they propagate.
- **`apply({ ops, ack })` with `ack < firstPendingSeq` is a no-op
  splice.** Idempotent re-ack — server can re-send the same ack
  arbitrarily; client must not double-splice or otherwise corrupt pending.
- **`apply({ ops: [{ set [], snapshot }] })` (root replace) marks every
  prior path as changed via `diffKeys`.** Initial server snapshot must
  surface a complete diff, including deleted top-level keys.
- **Two `send` calls back-to-back open separate frames.** The second
  call's `getChangedKeys` reflects only its own writes, not the first's.
- **A pending mutation reverted by an ack appears as changed in the
  rebuild frame.** If `pending[0]` wrote `messages[opt-0]`, then is acked
  and the server's commit doesn't include that key, the consumer's
  `getChangedKeys(["messages"])` must report `opt-0` so the UI can drop
  it.
- **`firstPendingSeq` reflects the next pending command's seq.** Send 3,
  ack 1 → `firstPendingSeq === 1`, `pending.length === 2`.
- **Mutator receives a stable seq across replays of the same command.**
  Send command at seq=N; trigger a rebuild without acking; mutator must
  re-run with the same `seq=N` (this is what makes `optimistic-${seq}`
  ids stable).
- **`isChangedAt` returns truthy for any path inside a marked subtree.**
  Mark at `[a]`; `isChangedAt(["a", "b", "c"])` is `true`.

## `tests/GorpSessions.test.ts`

The sessioned wrapper. Drives both `GorpServer` and `GorpRelay` through
the same wrapper and asserts the wire-protocol behaviour that used to
live in the inner-class tests.

- **`addClient` sends an initial snapshot envelope.** First message a
  client receives is `{ ops: [{ set [] state }] }`; ack only present if
  the session has prior history.
- **Per-session ack advances on `processed`.** After `handle.receive`,
  the next outbound envelope to that client carries
  `ack: session.highWater`.
- **Dedup'd resend doesn't re-run the handler.** Same `sessionId`
  reconnecting with the same `fromSeq` and resending — handler is not
  re-invoked.
- **Fan-out with per-session acks.** Two sessions see the same ops;
  each gets the ack covering its own commands.
- **End-to-end over `GorpRelay`.** Browser → wrapper → relay → upstream
  → wrapper → browser, ending with the round-trip ack.
- **`serialize` / `restore` round-trip with non-empty `outgoing`.**
  Disconnect upstream mid-flight, serialize, restore into a fresh
  wrapper, verify that a resent seq within the outgoing window is
  dedup'd (i.e. `lastForwardedSeq` was correctly rebuilt from the
  restored outgoing).

## `tests/GorpServer.test.ts`

Now pure-pubsub. Session/dedup behaviour moved to `GorpSessions.test.ts`.

- **Proxy writes emit a `set` op via `subscribe`.** One envelope per
  microtask, batching every write in the tick.
- **Assigning to `state` emits a root-set op.**
- **`receive` reports `processed: 1` in the same envelope as any ops
  the handler emitted.** Atomic — ops + count.
- **Multiple receives in one tick accumulate `processed`.**
- **Unsubscribe stops further envelopes.**
- **No-op flushes are suppressed** (empty ops, zero processed).

## `tests/GorpRelay.test.ts`

Now upstream-pipe-only. Session/dedup behaviour moved to
`GorpSessions.test.ts`.

- **`receive` forwards via `sendUpstream` and advances `upstreamSeq`.**
- **`applyUpstream` applies ops into the mirror and forwards them to
  subscribers.**
- **Ack advance emits `processed: ackDelta`.** When upstream acks
  high-water `H`, the matching count of upstream-pending entries
  splices and the subscriber sees `processed`.
- **Idempotent re-acks.** Same ack received twice → only the first
  advance counts.
- **`serialize` / `restore` round-trips state, sessionId, seq,
  high-water, and upstream-pending.**
- **Dedups a downstream command resent on a reconnected connection.**
  Browser disconnects mid-flight, reconnects with `fromSeq=0`, resends
  the same command — the relay's `lastForwardedSeq` blocks the second
  forward.
- **Two browsers see the same ops; each gets its own ack.** Per-session
  ack routing.
- **A new browser receives current mirror state on connect.** The relay
  keeps a state mirror; new clients see whatever upstream has produced.
- **A reconnecting browser's initial snapshot carries its prior ack.**
  Reconnect after one acked command — the second connection's first
  envelope has `ack=0`, so the client splices its still-pending entry.
- **`serialize` / `restore` round-trips state, sessions, and the
  `outgoing` queue.** Includes the case where a command is in-flight
  (upstream disconnected) — the outgoing entry survives the round-trip
  so post-restore ack routing still works.
- **End-to-end with `GorpClient`.** `GorpClient` → relay → `GorpServer`
  → relay → `GorpClient`, asserting eventual consistency.

## `tests/integration.test.ts`

A `GorpClient` and `GorpServer` wired together via a fake transport
(direct function calls; no network). Catches contract mismatches that
unit tests miss.

- **State eventually consistent across `send` → `receive` → `mutate` →
  `apply`.** Round-trip a single submit.
- **Reconnect resends pending; server dedups; client splices on the
  new ack.** Simulate dropping the connection mid-flight, reconnecting
  with `firstPendingSeq`, replaying. Final state must match a no-disconnect
  baseline.
- **Two clients on the same session see identical state after the same
  ops.** Fan-out coherence.
- **Out-of-window reconnect (server TTL'd the session) treats the client
  as fresh.** Documents the expected behavior for the "long disconnect"
  case so it isn't accidentally regressed.

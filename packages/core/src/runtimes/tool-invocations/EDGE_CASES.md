# `ToolInvocationTracker` — known state-transition edge cases

This document captures the non-trivial state transitions the tracker may
observe via `setState(snapshot)` and what the current behavior is.

## Hard contract

> **`streamCall` (and `execute`) fires exactly once per logical
> `toolCallId`.** No matter how the host's snapshot mutates after that
> first observation — args regress, args change after first completion,
> result is replaced, result is cleared, key order shuffles — the tracker
> never invokes the host's tool callback a second time.
>
> `reset()` starts a new execution boundary, and so does the single
> pipeline restart after a stream failure (F.4). A reused `toolCallId` in
> the next boundary gets a new execution identity and may fire once there.

This guarantees host-side side effects (the typical reason `streamCall` /
`execute` exists at all) can't double-run. The cost: post-completion
mutations are not surfaced to the host through the tool callback.
Consumers that need to observe them will opt into the planned
`reader.events()` API.

The tracker also never throws. Every public method that observes runtime
state (`setState`, `reset`, `abort`, `resume`) wraps its work in
try/catch and logs to `console.error`. The tracker is built into the hot
message-processing path; a malformed snapshot must never crash the host
runtime.

## A. Tool changes shape after first observation

### A.1. Args grow (normal streaming case)
Each snapshot's `argsText` is a longer prefix of the previous. The
tracker appends the delta into the active controller's `argsText`
stream. No re-fire.

### A.2. Args regress mid-stream (snapshot regression)
A later snapshot's `argsText` is shorter than what we already streamed,
or otherwise *not* a prefix of it. Under the exactly-once contract, the
tracker does **not** restart the stream. The controller keeps whatever
prefix already streamed. The regression is logged in non-prod. The
host's view diverges from the snapshot until `reader.events()` ships.

Subsequent snapshots that *are* prefixes of the new (regressed) snapshot
also won't be appended, because `entry.argsText` still points at the
pre-regression value used for delta calculation.

The args stream closes only when the controller's *streamed* content
(`entry.argsText`) is complete, not when a later snapshot is. A divergent
snapshot can be complete while the controller still holds an incomplete
stale prefix; closing on the snapshot would parse that stale prefix and
auto-submit a bogus parse-error result (resuming the host graph and
abandoning a pending interrupt). Gating the close on the streamed content
leaves the stream open until the prefix itself completes, so no stale
parse runs and no error result is fabricated from divergent args.

### A.3. Args complete then equivalent-JSON key reorder
Both old and new `argsText` parse to equivalent JSON values (e.g. keys
reordered by the backend). The tracker updates its tracked `argsText`
silently. No re-fire.

### A.4. Args complete then change to non-equivalent value
The tracker does **not** restart the stream and does **not** invoke
`streamCall` a second time. Logs the divergence in non-prod. The host's
existing `streamCall` keeps its original args view.

### A.5. First resolution (`result` becomes defined)
The tracker calls `setResponse` on the active controller and closes it.
The backend result is emitted before the args stream closes, so a stale
args parse failure cannot replace it. `reader.response.get()` resolves.
If the tool also had a frontend `execute`, the executor is short-circuited
via the entry's per-execution skip marker. Single fire.

### A.6. Previously-resolved tool's `result` is replaced
Silently ignored — `entry.hasResult` short-circuits both the
re-`setResponse` path and the downstream result-chunk handler. The host
sees only the first result.

### A.7. Previously-resolved tool loses its `result` (back to undefined)
Silently ignored. The entry stays in the resolved phase internally.

### A.8. Tool call carries a provider `approval`
The entry is marked `skipExecute`, exactly like a call observed with
a `result`, whether the gate is present when the call is first observed
or lands on an already-active entry. A gate belongs to the provider:
`approved === true` means the provider is producing the result, `false`
means it records the denial, so the frontend `execute` never fires for
that `toolCallId` once the gate is present. `streamCall` still fires
once and the backend result flows through A.5 when it lands.

If the gate lands after the args stream has closed but before an
in-flight `execute` resolves, the execute runs to completion (its side
effects happen) but its result chunk is dropped: `onResult` never fires,
and the `executing` status, plus any `human()` interrupt the execution
parked, stays up until the promise settles. Only a gate that lands after
the result chunk has already been emitted is fully too late.

A call the adapter reports as client-owned reaches that window while the
run is still open; a call whose ownership is unknown reaches it when the
run settles before the gate arrives (A.10). Either way the client was
meant to run it, so nothing but the gate's arrival says otherwise and the
gate is late by construction.

### A.9. Adapter reports the tool call as provider-owned
The entry is marked `skipExecute` at creation, exactly like a call
observed with a `result`. `unstable_isClientToolCall` is read once, when
the call is first observed live, and never re-read: ownership is fixed
when the provider emits the call, so a later snapshot cannot revoke it
and drop the result of an execute already in flight. `streamCall` still
fires once, as under A.8; only the wrapped `execute` and its result
chunk are withheld.

Outside production, a provider-owned call whose name resolves to a tool
with an `execute` logs a `console.warn`. The two together are a
misconfiguration: the provider answers the call, so the registered
`execute` would never run and the skip is otherwise silent.

The predicate is also what licenses running a frontend tool before the
provider's run ends, so an adapter that supplies it keeps the overlap
between a client tool's work and the run tail (A.10).

### A.10. Args complete while the provider's run is still open
Closing the args stream hands the call to the client executor, so it may
only happen once the provider can no longer speak about that call. A
provider may still answer the call (A.5) or gate it (A.8) one or more
snapshots after its arguments complete, and a protocol can carry the
outcome no earlier: AG-UI projects an interrupt only from `RUN_FINISHED`.
The run ending is the only universal signal, so a call whose ownership is
unknown closes when the snapshot's `isRunning` goes false.

`ExternalStoreThreadRuntimeCore` feeds the tracker
`store.isRunning || _hasExecutingTools(store)`, so that condition also covers
a client tool mid-`execute`. That defers an unknown-ownership sibling only
while a client-owned call is actually executing, which no shipped adapter
produces: every entry pending in a snapshot closes in the same
`_processMessages` pass, an adapter that supplies the predicate classifies
every call, and an execution parked on `human()` reports `interrupt` rather
than `executing`, which `_hasExecutingTools` does not count.

That holds even when `execute` opens with `await human()`. The stream
fires `onExecutionStart` only after `execute` returns, because until then
it cannot tell a frontend tool from one without an `execute`, so by the
time the callback runs the body has already parked its resolver and set
`interrupt`. `_onExecutionStart` still registers the execution for
`_onExecutionEnd` but leaves the status alone when this execution's own
request is pending. The check is keyed on the request's execution id,
not on the status map: a pipeline restart (F.4) clears `_executing` but
keeps the status map, and a stale `interrupt` must not stop the fresh
execution from reporting `executing` (#6763).

A call the adapter reports as client-owned (A.9) closes as soon as its
arguments parse, because the adapter has already said the provider will
not answer it. Ownership says who answers a call, not whether it is
gated, so a gate on such a call is still late and A.8 governs it
(#6677).

### A.11. The turn is discarded while a call waits on the run
`abort({ discardPending: true })` records every active entry that has
neither closed its args stream nor holds a result in
`_discardedToolCallIds`, and marks it `skipExecute`.

The abort signal alone does not cover these. A call waiting on the run to
settle (A.10) has not reached the executor, so there is nothing to signal,
and `abort()` installs a fresh `AbortController` before the settled
snapshot arrives; without the record, cancelling a run would be what
starts the call it was meant to stop.

`discardPending` is the caller's claim that the turn is over, not that it
is being interrupted, so only the three callers that end it pass it: a new
turn starting, a reload, and `cancelRun`. `deleteMessage` does not: its
`setMessages` fallback aborts while the provider run continues, and
discarding there would strand that run's remaining calls result-less,
while its `onDelete` path never aborts at all. `reset()` is unaffected
either way: it clears `_entries` and the recorded ids before aborting,
because it opens a new execution boundary.

An id is forgotten once a live snapshot observes the call with a result,
which bounds the set to the open calls of a discarded turn. That is all
it does: an id re-emitted inside the same execution boundary keeps its
existing entry, so A.4 and A.7 govern it rather than this set, and a new
boundary clears the set outright. The residual is a call that is
discarded, answered, and then loses its result (A.7) across a pipeline
restart; it is left to A.7 rather than pinned here, because holding the
id past the answer would trade a five-step chain for a set that grows for
the life of the tracker.

The record lives on the tracker rather than the entry because it is the one
reason to skip that no later snapshot carries: an `approval` is re-read at
each snapshot and provider ownership is recomputed, while a rebuilt entry
would otherwise come back clean. That is what lets F.4 drop a waiting entry
without a special case.

## B. Tool call disappears from snapshot

### B.1. Tool call removed entirely (rollback, branch switch)
The tracker does not auto-clean entries that disappear from the
snapshot. The entry persists in `_entries` until the next `reset()`.

Auto-cleanup is intentionally avoided: if the same `toolCallId` ever
reappears in a later snapshot, treating it as new would re-fire
`streamCall`, violating the exactly-once contract. The cost is a bounded
memory accumulation across the tracker's lifetime; `reset()` clears it.

## C. Initial snapshot vs. live snapshot

### C.1. Tool call present in the initial snapshot
While `_pendingRestore === true` (either by construction, or because
`snapshot.isLoading === true`), tool calls are recorded as restored
entries with no controller. `streamCall` / `execute` do not fire.

### C.2. Restored entry observed in a live snapshot, unchanged
Silently kept as restored. Recursion into `content.messages` still
happens so any nested live tool calls are processed.

### C.3. Restored entry observed in a live snapshot, signature changed
The restored entry is deleted and a new active entry starts via
`_startActiveEntry`. This is PR #4057's promotion path. `streamCall`
fires once — its first and only fire for this `toolCallId`.

### C.4. `isLoading` transitions `true → false` while messages are stable
The next `setState` call sees `isLoading === false` and processes
messages as live. Snapshots observed while `isLoading` was true seeded
restored entries. The first live snapshot promotes any whose signature
changed.

### C.5. `isLoading` transitions `false → true` mid-session
Treated as a return to the historical-loading window. Subsequent
snapshots are recorded as restored. Tool calls observed live before the
transition keep their active controllers — the tracker does not unwind
them.

## D. Nested tool calls (PTC sub-tools via `content.messages`)

### D.1. Parent tool's nested messages are observed
The tracker recurses via `_processMessages(content.messages)`. Nested
tool calls go through the same restore / live / promotion logic as
top-level ones, all under the same exactly-once contract.

### D.2. Nested tool's parent gets a new `result`
Handled like A.5 for the parent; the recursion into `content.messages`
still runs in the same pass, so nested tool calls also get processed.

### D.3. Nested tool's `content.messages` itself changes
Identity is by `toolCallId`, not index. A different `toolCallId` at
the same nested position is a fresh tool call. Same id with different
shape goes through A.1–A.4.

## E. Malformed snapshot

### E.1. `message` is null/undefined or `message.content` is not an array
Skipped silently. The rest of the snapshot still processes.

### E.2. `content` item is null or not a tool-call part
Skipped silently. Other parts in the same `message.content` still process.

### E.3. Different `messages` reference, identical contents
The tracker re-walks the array on every non-identity snapshot. The
reference-equality fast path in `setState` rarely fires for class
consumers (external-store rebuilds the array on every adapter update).

### E.4. `setState` throws inside `_processMessages`
The top-level try/catch in `setState` swallows the error and logs.
`_lastSnapshot` and `_isRunning` mutations are deferred until *after*
successful processing, so a transient failure does not corrupt the
tracker's view of "what we last observed". The next snapshot retries.

## F. Concurrency and lifecycle

### F.1. `reset()` called while `execute()` invocations are in flight
`abort()` is invoked, in-flight executions reject with
`Tool execution aborted`. Once they settle, the cleanup logic removes their
execution identities from `_executing`. The settled-resolver promises fire so
the abort promise resolves.

### F.2. `setState` called during `reset()`'s in-flight abort
The new snapshot is processed against an empty `_entries`. Tool calls
in it are seeded as restored (because `reset()` re-armed
`_pendingRestore`). Eventual cancellation `result` chunks for the aborted
executions are dropped when their execution identity no longer matches the
current entry.

### F.3. `resume(toolCallId, payload)` for an unknown id
Silently no-ops. (The pre-class hook *threw*; the tracker softens this
to match the never-throw guarantee.)

### F.4. Assistant-stream pipeline itself errors
The `.pipeTo(...).catch(...)` handler logs and flips `_pipelineDead`.
The next `setState` call recreates the pipeline once per tracker
lifetime: existing active entries are *demoted to restored* (so the
rebuilt pipeline does not re-fire `streamCall` for them) and the
snapshot is processed against the fresh pipeline. An active entry that
neither closed its args stream nor holds a result is dropped instead of
demoted: a restored entry is promoted only when its signature changes,
and a call waiting on the run to settle (A.10) already holds its final
args, so demoting it would strand it unexecuted.

Starting it over re-fires `streamCall`, which the restart path already
does for any demoted entry whose signature later changes. The rebuilt
pipeline holds no part for the call, so nothing can reach the executor
without adding one; a restart is an execution boundary in the same sense
`reset()` is. Repeated failures
keep the tracker dead with a visible error to avoid restart loops.

### F.5. Reset followed by same-id reuse
The assistant-stream pipeline assigns each streamed tool part an opaque
execution identity. Human-input callbacks, lifecycle callbacks, result chunks,
and pending execution cleanup are accepted only when that identity is still
current for the `toolCallId`. A late callback from before `reset()` is therefore
dropped even when the next session reuses the id.

## Known limitations

### Host callback throws
`onResult` and `onStatusesChange` are invoked through wrappers that
catch and log. The tracker continues to function; the host's bad
callback is isolated.

### Args-stream divergence after A.2 / A.4
Documented in the corresponding sections. The host's `streamCall` may
operate on stale args. The `reader.events()` follow-up gives consumers
a way to observe and react to these post-completion transitions.

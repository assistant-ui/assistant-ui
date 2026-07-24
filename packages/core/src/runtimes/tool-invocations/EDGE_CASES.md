# `ToolInvocationTracker` — known state-transition edge cases

This document captures the non-trivial state transitions the tracker may
observe via `setState(snapshot)` and what the current behavior is.

## Hard contract

> **`streamCall` (and `execute`) fires exactly once per logical
> `toolCallId`.** No matter how the host's snapshot mutates after that
> first observation — args regress, args change after first completion,
> result is replaced, result is cleared, key order shuffles — the tracker
> never invokes the host's tool callback a second time.

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
via `_skipExecuteStreamIds`. Single fire.

### A.6. Previously-resolved tool's `result` is replaced
Silently ignored — `entry.hasResult` short-circuits both the
re-`setResponse` path and the downstream result-chunk handler. The host
sees only the first result.

### A.7. Previously-resolved tool loses its `result` (back to undefined)
Silently ignored. The entry stays in the resolved phase internally.

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
`Tool execution aborted`. Once they settle, the cleanup logic clears
`_executing`. The settled-resolver promises fire so the abort promise
resolves.

### F.2. `setState` called during `reset()`'s in-flight abort
The new snapshot is processed against an empty `_entries`. Tool calls
in it are seeded as restored (because `reset()` re-armed
`_pendingRestore`). Eventual cancellation `result` chunks for the
aborted executions are dropped via `_skipExecuteStreamIds`.

### F.3. `resume(toolCallId, payload)` for an unknown id
Silently no-ops. (The pre-class hook *threw*; the tracker softens this
to match the never-throw guarantee.)

### F.4. Assistant-stream pipeline itself errors
The `.pipeTo(...).catch(...)` handler logs and flips `_pipelineDead`.
The next `setState` call recreates the pipeline once per tracker
lifetime: existing active entries are *demoted to restored* (so the
rebuilt pipeline does not re-fire `streamCall` for them) and the
snapshot is processed against the fresh pipeline. Repeated failures
keep the tracker dead with a visible error to avoid restart loops.

## Known limitations

### Host callback throws
`onResult` and `onStatusesChange` are invoked through wrappers that
catch and log. The tracker continues to function; the host's bad
callback is isolated.

### Args-stream divergence after A.2 / A.4
Documented in the corresponding sections. The host's `streamCall` may
operate on stale args. The `reader.events()` follow-up gives consumers
a way to observe and react to these post-completion transitions.

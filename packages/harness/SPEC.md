# @assistant-ui/harness Spec

A framework-agnostic client for agent harnesses. One tap resource owns all
logic; `useHarness` (React) and `new Harness()` (anywhere else) are thin
bindings over it.

## State

`HarnessState` is canonical and server-owned. Each transport snapshot replaces
the previous state wholesale; the client never merges fields.

```ts
type HarnessState<TExtras> = {
  messages: Record<string, HarnessMessage>; // id-keyed tree
  queue: HarnessQueueItem[];                // sends accepted mid-run
  files: Record<string, { content?; size?; modifiedAt? }>;
  todos: { content; status }[];
  status: { phase: "idle" | "running" };
  interrupt: { id; value; resumable } | null;
  error: { message; code? } | null;         // cleared by the server on next run start
  title?: string;
  extras?: TExtras;                          // app-specific server state
};
```

### Message nesting

A message's `parentId` is one of:

- the preceding message id (the transcript chain),
- `null` (start of the main thread),
- a tool call id, which roots a nested transcript.

Tool-call-rooted transcripts are the single nesting primitive: a task
subagent's transcript and a programmatic (in-REPL) tool sub-call both stream
as ordinary messages parented under the dispatching tool call id, recursively.
The client derives `subagents`, a recursive record keyed by tool call id, from
this alone. On branch points the latest child wins.

Sibling order is the key insertion order of `messages`. JavaScript enumerates
integer-like string keys numerically before all others, so ids must not be
integer-like ("2", "10"); use UUIDs or prefixed ids ("msg_2").

## Commands

Commands are delivered in batches: `POST { commands, state, threadId }`. The
built-in vocabulary:

| command | payload | effect |
| --- | --- | --- |
| `send-message` | `{ id, parts, behavior }` | append a user message; `behavior` is `"queue"` (process after the current run) or `"steer"` (process next) |
| `add-tool-result` | `{ toolCallId, output, isError? }` | settle a client-executed tool call |
| `resume` | `{ interruptId, value }` | answer the interrupt with that id |
| `cancel` | | cooperatively stop the active run |
| `cancel-queued` | `{ id }` | remove a queue entry |
| `send-now` | `{ id }` | promote a queue entry to the front |

App-specific commands augment the `HarnessCustomCommands` interface.

## Reconciliation

Optimistic sends are echo-based identity merges. `send-message.id` is
client-generated and becomes the user message id (or the queue item id when
the server queues it). The client renders the pending send appended at the
main-thread leaf until the id appears in `state.messages` or `state.queue`;
at that moment the optimistic entry is dropped and the server copy, same id,
takes over. When the run that carried a batch settles (finish, error, or
abort), its remaining optimistic entries are dropped: server state is always
the source of truth.

## Run loop

One request is in flight at a time. Commands issued in the same tick batch
into one request; commands issued mid-run coalesce into a single follow-up
request after the current stream ends. `stop()` closes the local stream, then
delivers `cancel` so the server stops the still-running background run.

`status` is derived: `"submitted"` (batch sent or pending, nothing streamed
yet), `"streaming"` (snapshots flowing, or the server reports an active run),
`"error"` (transport or server error while idle), else `"ready"`.

## Transport

```ts
type HarnessTransport = {
  run(input: { threadId; commands; state; signal }): AsyncIterable<HarnessState>;
  resume?(input: { threadId; state; signal }): AsyncIterable<HarnessState>;
};
```

`run` delivers a batch and streams snapshots until the run settles. `resume`
reconnects to a thread: it replays the current snapshot and streams any run
still active server-side. Passing `resume: true` to the harness calls it once
on mount (snapshot-on-connect); the thread `id` keys the server checkpoint, so
persist it to have something to reconnect to.

Transports are tap resources: the `transport` option takes a resource element
producing a `HarnessTransport`, mounted inside the harness so it shares its
lifecycle (cleanup on dispose, reactive options). A custom transport is
`resource((options) => ({ run, resume? }))`.

`HttpHarnessTransport(options)` is the built-in resource for the
assistant-transport wire: POST to `api` (or `resumeApi`), decode the response
with assistant-stream, and yield each `unstable_state` snapshot. `resume` is
defined only when `resumeApi` is set. Its decode pipeline intentionally
duplicates the legacy assistant-transport runtime's; it stands alone so the
legacy runtime can be removed without touching this package.

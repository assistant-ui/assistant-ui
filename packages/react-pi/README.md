# @assistant-ui/react-pi

Pi coding-agent runtime adapter for [assistant-ui](https://www.assistant-ui.com/).

This package lets assistant-ui render and drive [Pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent)-backed
threads: streaming assistant/reasoning output, tool calls with live streaming
results, mid-run steering and follow-up, per-thread model/thinking controls,
the blocking extension UI (Pi's entire human-in-the-loop/approval surface), and
a multi-thread thread list.

## Package boundary

The package has two entry points:

- `@assistant-ui/react-pi` — **browser-safe**. The runtime hook, the pure event
  reducer, the message projection, and the HTTP `PiClient`. This entry **never**
  imports `@earendil-works/pi-*`; it speaks an RPC-isomorphic, JSON-safe
  contract (`PiClient`) over an arbitrary transport.
- `@assistant-ui/react-pi/node` — **node-only**. `createPiNodeClient`, which
  drives Pi's `AgentSession` SDK in-process behind a process-singleton
  `PiThreadSupervisor`. Only this entry pulls in Pi's Node packages.

HTTP is one implementation of `PiClient`, not the contract — the runtime hook
never bakes in a transport. You can serve the node client over HTTP/SSE (below),
hand it straight to `usePiRuntime` in a colocated Electron/main-process setup, or
write any other transport that satisfies `PiClient`.

## Install

```bash
npm install @assistant-ui/react-pi @assistant-ui/react
# the node entry drives the Pi SDK on the server:
npm install @earendil-works/pi-coding-agent
```

`@earendil-works/pi-coding-agent` is an optional peer dependency — browser-only
consumers (those importing a remote `PiClient`) never pull it in. The `./node`
entry needs it.

## Quickstart (HTTP/SSE transport)

The two halves of one `PiClient` contract:

```
browser                         server (Node)
─────────                       ─────────────
usePiRuntime                    route layer (GET/POST /api/pi/**)
  └ createPiHttpClient  ──HTTP──▶ createPiNodeClient(...)
       (fetch + SSE)               └ PiThreadSupervisor → Pi SDK
```

### 1. Server: the node client

`createPiNodeClient` returns a `PiClient`. It owns a **process-singleton**
supervisor pinned to `globalThis`, so it survives Next.js dev HMR — create it in
a module-level server file, never per request.

```ts
// lib/pi-server.ts  (server-only — imported only from route handlers)
import { createPiNodeClient } from "@assistant-ui/react-pi/node";

export const piClient = createPiNodeClient({
  workspacePath: process.env.PI_WORKSPACE_PATH ?? process.cwd(),
  // agentDir?: override Pi's config dir (default ~/.pi/agent)
  // model?:    a resolved Pi `Model` to seed new sessions (see Model controls)
});
```

### 2. Server: the route layer

Expose the `PiClient` methods over HTTP, and `subscribe` over SSE. The wire
contract `createPiHttpClient` expects (relative to `baseUrl`, default `/api/pi`):

```
GET    /threads                 → PiThreadMetadata[]
POST   /threads                 → PiThreadSnapshot      (body: create input)
GET    /threads/:id             → PiThreadSnapshot      (read-only snapshot)
PATCH  /threads/:id             → 204                   (body: { title })
POST   /threads/:id/messages    → 204                   (body: { input })
POST   /threads/:id/cancel      → 204
GET    /models                  → PiModelInfo[]
POST   /threads/:id/model       → 204                   (body: { provider, modelId })
POST   /threads/:id/thinking    → 204                   (body: { level })
POST   /threads/:id/archive     → 204
POST   /threads/:id/unarchive   → 204
DELETE /threads/:id             → 204
POST   /threads/:id/host-ui     → 204                   (body: { response })
GET    /threads/:id/events      → SSE of PiClientEvent  (?snapshot=false skips initial snapshot)
```

The events route must stream `piClient.subscribe(threadId, …)` and unsubscribe on
request abort. A browser disconnect must **not** abort the run — see Reconnect.
See [`examples/with-pi/app/api/pi/**`](../../examples/with-pi/app/api/pi) for a
complete Next.js App Router implementation.

### 3. Browser: the runtime

```tsx
"use client";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { createPiHttpClient, usePiRuntime } from "@assistant-ui/react-pi";
import { useMemo } from "react";

export function PiRuntimeProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => createPiHttpClient(), []); // baseUrl defaults to /api/pi
  const runtime = usePiRuntime({ client /*, workspacePath, includeArchived */ });
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
```

`usePiRuntime` requires `options.client` — there is no implicit transport. Drop
the provider above any assistant-ui thread UI (`Thread`, `ThreadList`, …).

## Environment / model resolution

A Pi session needs a model and credentials. Resolution mirrors Pi's own
`createAgentSession`: an explicit `PI_PROVIDER` + `PI_MODEL_ID` wins, otherwise Pi
falls back to its configured default (`settings.json`'s `defaultProvider` /
`defaultModel`). A user who is authenticated with `pi` and has a default model
picked needs **no env at all**.

| Variable              | Purpose                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `PI_PROVIDER`         | Override provider for new sessions (e.g. `anthropic`).                                        |
| `PI_MODEL_ID`         | Override model id for new sessions.                                                           |
| `PI_WORKSPACE_PATH`   | Working directory the agent reads/writes/runs shell commands in. Point it at a scratch dir.   |
| `PI_CODING_AGENT_DIR` | Pi's agent config dir (`~/.pi/agent` by default).                                            |

The `./node` entry takes a resolved Pi `Model` via `createPiNodeClient({ model })`
to seed new sessions. Use Pi's own `ModelRegistry` / `SettingsManager` /
`AuthStorage` on the server to resolve it. See
[`examples/with-pi/lib/pi-server.ts`](../../examples/with-pi/lib/pi-server.ts).

## Model & thinking controls

Per-thread, surfaced through `usePiRuntimeExtras()`:

```tsx
import { usePiRuntimeExtras } from "@assistant-ui/react-pi";

const { readiness, contextUsage, setModel, setThinkingLevel } = usePiRuntimeExtras();
// readiness: "ready" | "missing-model" | "missing-credentials" | "unavailable-model"
// await setModel({ provider, modelId });
// await setThinkingLevel("off" | "minimal" | "low" | "medium" | "high" | "xhigh");
```

`getAvailableModels()` on the client returns the catalog (auth-configured models
first, falling back to the full built-in list). `setThinkingLevel` is clamped by
Pi to the model's supported levels; the UI reflects the effective level from the
next snapshot/event. `contextUsage` (`{ tokens, contextWindow, percent }`)
answers "am I about to auto-compact?" and is available even for cold threads.

`readiness` gates sending — block the composer and show the `readiness.message`
(a concrete next step, e.g. "Authenticate with `pi`, then restart the server.")
when it is not `"ready"`.

## Composer run semantics

Pi's defining interaction is mid-run steering, and a plain `prompt()` while
streaming **throws**. The runtime exposes Pi's native queue to assistant-ui
(`capabilities.queue`), so the standard composer keeps accepting input during a
run and derives the right behavior:

| State / action                 | Behavior                                             |
| ------------------------------ | ---------------------------------------------------- |
| idle + submit                  | `prompt()`                                           |
| running + Enter                | follow-up (`streamingBehavior: "followUp"`) — queued |
| running + Cmd/Ctrl+Shift+Enter | steer (`streamingBehavior: "steer"`)                 |

To force steer from your own composer, send with `steer: true` or set
`message.runConfig.custom.streamingBehavior = "steer"`. While running, an
omitted behavior defaults to `"followUp"`.

Queued messages live in Pi's queue, **not** the transcript — Pi appends the
user message only when the queue flushes. The runtime mirrors them as queue
items (`s.composer.queue`, renderable with `ComposerPrimitive.Queue`) and on
the thread metadata's `queuedMessages`. Pi supports clearing the whole queue
(`clearQueue()` on the client / `usePiRuntimeExtras().clearQueue()`, which
resolves with the cleared text so it can be restored into the composer), but
no per-item remove/promote (see Known limitations).

## Host-UI requests (the approval surface)

Pi has no built-in permission system — the **only** human-in-the-loop mechanism is
extensions/tools calling `ctx.ui.confirm / select / input / editor`. This package
implements and binds the `ExtensionUIContext` on the server and routes the four
blocking dialogs to the UI, split by causality:

- **Tool-associated** (a dialog raised while exactly one tool is executing) →
  rendered as a native `ToolCallMessagePart.approval` (confirm) or
  `.interrupt` (select/input/editor), wired through the runtime's
  `onRespondToToolApproval` / `onResumeToolCall`.
- **Free-standing** (extension commands, or any request raised while multiple
  tools are in flight) → a side channel:

```tsx
import { usePiHostUiRequests } from "@assistant-ui/react-pi";

const { requests, respond } = usePiHostUiRequests();
// confirm:                 respond({ requestId, confirmed: boolean })
// select/input/editor:     respond({ requestId, value: string })
//                      or  respond({ requestId, dismissed: true })
```

Pi's UI requests carry no `toolCallId`, so causality is only inferred when a
single tool is executing; otherwise requests stay on the side channel. Pending
requests are tracked on the server record (not the SSE connection), so a
reconnecting client still sees them. Unsupported `ExtensionUIContext` methods
degrade rather than crash.

## Reconnect semantics

- The supervisor keeps the runtime alive across browser disconnects — only an
  explicit `cancelRun` or process exit stops a run. **A dropped SSE never aborts.**
- Every (re)connect is **snapshot-first**: the server re-sends an authoritative
  `snapshot` event, then live events apply on top. There is no event replay in the
  MVP; the snapshot is authoritative.
- Cold/historical threads load via a **read-only session-file snapshot** — opening
  a thread to read it does **not** spin up a live `AgentSession`. A live runtime is
  created only when you send, cancel, change model/thinking, answer host UI, or
  explicitly subscribe to live events.

## Selector hooks

The runtime keeps high-frequency transcript state separate from low-frequency
metadata, so metadata controls don't rerender on every token:

- `usePiRuntimeExtras()` — `status`, `readiness`, `contextUsage`, `queue`,
  `compaction`, `retry`, `lastError`, host-UI requests, and the `cancel` /
  `refresh` / `clearQueue` / `setModel` / `setThinkingLevel` / `respondTo*` /
  `resumeToolCall` actions.
- `usePiSession()` — the current `PiThreadMetadata` (or `null`).
- `usePiThreadState(selector?)` — the raw reducer state, optionally selected.
- `usePiHostUiRequests()` — free-standing host-UI requests + a responder.

## Known limitations (MVP)

- **No RPC-subprocess transport.** The SDK-in-process node client assumes one
  long-lived Node process; it does not survive serverless/edge. The contract is
  RPC-isomorphic so a subprocess/remote transport can drop in later.
- **No durable event replay / backpressure / version negotiation.** Recovery is
  snapshot-first only.
- **Idle threads are not auto-followed on view.** Opening a thread is a cheap
  read-only snapshot; the runtime auto-subscribes to live events only when the
  loaded snapshot reports the thread as running (or when you send). A run that
  starts elsewhere *after* you opened an idle view shows up on the next
  refresh, not live. (`controller.connect()` exists for explicit always-live
  subscription.)
- **The node host's catalog is process-local and in-memory.** It caches
  `SessionManager.list()` and tracks archive state for the running process; nothing
  is persisted across restarts (no last-selected workspace, drafts, labels, or
  search index). Workspace is just a `workspacePath` string on the client — the UI
  for choosing one (text field, directory picker, …) is the consuming app's
  concern, not this package's.
- **No fork/clone/navigate or per-item queue editing.** The reducer/projection
  preserve the underlying data — tree linkage (`parentSessionPath`), queued
  messages (`queuedMessages`), and compaction state — so a consumer can build those
  surfaces, but the client exposes no methods to fork a session, navigate the
  tree, or reorder the queue. Queue items mirror Pi's server-side queue:
  enqueueing works (that's how mid-run follow-up/steer is sent) and clearing
  all works (`clearQueue`, mirroring Pi's only queue mutation), but per-item
  steer/remove affordances are no-ops — Pi has no such API.
- **Attachments are image-passthrough only.** Non-image input parts aren't
  converted into Pi user content.
- **Model/thinking are the only runtime-config actions.** There are no
  provider/auth/credential or default-model/settings methods on the client — manage
  those with Pi's own SDK on the server. Skills/extensions/slash-commands aren't
  surfaced.

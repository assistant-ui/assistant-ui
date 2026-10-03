# `@assistant-ui/acp`

[ACP (Agent Client Protocol)](https://agentclientprotocol.com/) adapter for
[assistant-ui](https://www.assistant-ui.com/). The sequel to
[`@assistant-ui/react-a2a`](../react-a2a/README.md): where react-a2a speaks
Google's A2A protocol over fetch + SSE, this package speaks ACP v1 over a
single WebSocket carrying JSON-RPC in both directions — the transport used by
agents like [crow](https://crow-ai.dev) (`crow acp --http`).

- ACP session ↔ assistant-ui thread
- `session/update` notifications ↔ streamed assistant message parts
  (text chunks, thought chunks, tool calls)
- `session/request_permission` server requests ↔ tool-call **approvals**
  (ACP's `allow_once`/`allow_always`/`reject_once`/`reject_always` map 1:1 to
  assistant-ui's approval option kinds)

## Installation

```sh
npm install @assistant-ui/acp @assistant-ui/react
```

## Usage

```tsx
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAcpRuntime } from "@assistant-ui/acp";

export function App() {
  const runtime = useAcpRuntime({
    url: "ws://127.0.0.1:2770/",
    // permissions: "auto-allow",  // default "ask" shows approval UI
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* your thread UI, e.g. the shadcn kit's <Thread /> */}
    </AssistantRuntimeProvider>
  );
}
```

### Options

| Option             | Description                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| `url`              | WebSocket endpoint of the ACP agent (`ws://` / `wss://`).                    |
| `client`           | Pre-built `AcpClient` (alternative to `url`).                                |
| `cwd`              | Absolute working directory for `session/new` (default `"/"`). Set it when    |
|                    | the agent's file tools need a project root.                                  |
| `mcpServers`       | MCP servers to pass to `session/new`.                                        |
| `clientInfo`       | Client identity for the `initialize` handshake.                              |
| `permissions`      | `"ask"` (default) or `"auto-allow"`.                                         |
| `autoConnect`      | Connect + `initialize` on mount (default `true`).                            |
| `webSocketFactory` | Inject a custom WebSocket implementation (tests, proxies).                   |
| `onError`          | Error callback (connection failures, prompt errors).                         |
| `onCancel`         | Called after a run has been cancelled.                                       |

### Bringing your own `AcpClient`

Pass `client` to share one connection between runtimes or to configure the
transport yourself. The runtime **subscribes** to the client
(`subscribeSessionUpdate` / `subscribeConnectionChange`) and unsubscribes when
it unmounts, so your own listeners keep working alongside it.

Approvals are the one thing a client can only have one of. A client constructed
with a `permissionHandler` keeps it — the runtime does not replace it, and the
approval UI stays out of the way. A client without one gets the runtime's
handler for as long as the runtime is mounted, and the refusing default back
when it unmounts.

### Extras hooks

Every hook falls back to a safe default when no ACP runtime is active.

```tsx
import {
  useAcpAgentCapabilities,
  useAcpAgentInfo,
  useAcpAvailableCommands,
  useAcpConfigOptions,
  useAcpConnectionState,
  useAcpCurrentModeId,
  useAcpPlan,
  useAcpSessionId,
  useAcpSessionTitle,
  useAcpUsage,
} from "@assistant-ui/acp";
```

## How it maps ACP → assistant-ui

| ACP                                        | assistant-ui                                             |
| ------------------------------------------ | -------------------------------------------------------- |
| WebSocket connection + `initialize`        | runtime connection state (`useAcpConnectionState`)       |
| `session/new` → `sessionId`                | thread (`useAcpSessionId`)                               |
| `session/prompt`                           | append / run                                             |
| `agent_message_chunk`                      | text content part (streamed)                             |
| `agent_thought_chunk`                      | reasoning content part (streamed)                        |
| `tool_call` / `tool_call_update`           | tool-call content part (title, args, result, status)     |
| `session/request_permission`               | tool-call approval (`requires-action` until answered)    |
| `session/cancel`                           | cancel                                                   |
| `plan`                                     | `useAcpPlan`                                             |
| `session_info_update`                      | `useAcpSessionTitle`                                     |
| `current_mode_update`                      | `useAcpCurrentModeId`                                    |
| `available_commands_update`                | `useAcpAvailableCommands`                                |
| `config_option_update`                     | `useAcpConfigOptions`                                    |
| `usage_update`                             | `useAcpUsage`                                            |
| `initialize` → `agentInfo`/`agentCapabilities` | `useAcpAgentInfo` / `useAcpAgentCapabilities`        |

Browser clients advertise **no** filesystem or terminal capabilities, so a
conforming ACP agent will never send `fs/*` or `terminal/*` requests; any such
request is answered with JSON-RPC `-32601`.

## Limitations

**Editing and regenerating a message are not offered.**
An ACP v1 session's history lives on the agent and can only be appended to —
stable v1 has no fork or rewind primitive (`session/fork` is in the schema but
marked UNSTABLE, and takes no turn anchor). Re-sending an edited or reloaded
user message on the *same* session would branch the assistant-ui thread while
leaving the agent holding every turn the UI replaced, so the runtime wires
neither `onEdit` nor `onReload` and both actions stay disabled. Fork-and-replay
support belongs in a follow-up.

**There is no history adapter: the agent owns the transcript.**
`useAcpRuntime` takes no `adapters.history` and ignores one a thread list
provides through `RuntimeAdapterProvider`. A transcript restored from storage
would put messages on screen that the next `session/new` knows nothing about, so
the agent would answer from an empty context while the user reads a full
conversation. Persisting the ACP `sessionId` with the thread and restoring it
with `session/load` is what makes a restored thread real; it belongs in a
follow-up.

**A dropped connection cannot silently continue the thread.**
The agent loses the session when the socket goes away. On reconnect the client
calls `session/load` for the session it lost, if `agentCapabilities.loadSession`
advertises it, and otherwise rejects the next prompt with an error naming that
session. Surface the error as a "start a new thread" prompt: retrying on the
same client starts a fresh session that does not have the transcript on screen.

**Attachments the agent did not opt into are withheld.**
ACP's baseline prompt content is text and resource links; `image`, `audio` and
embedded `resource` blocks all need `agentCapabilities.promptCapabilities`.
Blocks the agent cannot accept are left out of `session/prompt` — an embedded
resource is downgraded to a resource link instead — and reported through
`onError`. The message keeps its attachments in the transcript either way.

**`cwd` defaults to `"/"`.** ACP requires an absolute path; set `cwd` when the
agent's file or terminal tools need a real project root.

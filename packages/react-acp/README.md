# `@assistant-ui/react-acp`

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
npm install @assistant-ui/react-acp @assistant-ui/react
```

## Usage

```tsx
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAcpRuntime } from "@assistant-ui/react-acp";

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
| `adapters.history` | Persist/restore the transcript. This adapter does not use ACP's optional     |
|                    | `session/load`; restoring a transcript is the history adapter's job.          |

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
} from "@assistant-ui/react-acp";
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

**Editing or regenerating a message does not branch the agent's transcript.**
An ACP v1 session's history lives on the agent and can only be appended to —
stable v1 has no fork or rewind primitive. `onEdit` and `onReload` create a
branch in the assistant-ui thread and re-send the edited user message as the
next `session/prompt` on the *same* session, so the agent still has the turns
the UI replaced and will answer conditioned on them. This matches
[`@assistant-ui/react-a2a`](../react-a2a/README.md), whose `reload()` likewise
re-sends into the same server context. Fork-and-replay support belongs in a
follow-up.

**Restoring a transcript does not restore the agent's context.**
`adapters.history` rebuilds the UI transcript, but the next turn starts from a
fresh `session/new`, so the agent sees none of it. ACP's optional
`session/load` — gated on `agentCapabilities.loadSession` — is not used yet and
is the intended fix for this.

**`cwd` defaults to `"/"`.** ACP requires an absolute path; set `cwd` when the
agent's file or terminal tools need a real project root.

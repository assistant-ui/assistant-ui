# `@assistant-ui/react-acp`

[ACP (Agent Client Protocol)](https://agentclientprotocol.com/) adapter for
[assistant-ui](https://www.assistant-ui.com/). The sequel to
[`@assistant-ui/react-a2a`](../react-a2a/README.md): where react-a2a speaks
Google's A2A protocol over fetch + SSE, this package speaks ACP v1 over a
single WebSocket carrying JSON-RPC in both directions — the transport used by
agents like [crow](https://crow-ai.dev) (`crow acp --http`).

- ACP session ↔ assistant-ui thread
- `session/update` notifications ↔ streamed assistant message parts
  (text chunks, thought chunks, tool calls, plans)
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
| `cwd`              | Working directory for `session/new` (default `"."`).                         |
| `mcpServers`       | MCP servers to pass to `session/new`.                                        |
| `permissions`      | `"ask"` (default) or `"auto-allow"`.                                         |
| `autoConnect`      | Connect + `initialize` on mount (default `true`).                            |
| `webSocketFactory` | Inject a custom WebSocket implementation (tests, proxies).                   |
| `onError`          | Error callback (connection failures, prompt errors).                         |
| `adapters.history` | Persist/restore the transcript (ACP v1 has no server-side history fetch).    |

### Extras hooks

```tsx
import {
  useAcpConnectionState,
  useAcpPlan,
  useAcpSessionTitle,
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
| `plan` / `session_info_update` / modes     | extras hooks                                             |

Browser clients advertise **no** filesystem or terminal capabilities, so a
conforming ACP agent will never send `fs/*` or `terminal/*` requests; any such
request is answered with JSON-RPC `-32601`.

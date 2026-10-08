# `@assistant-ui/acp`

> This package is private and not published to npm. Its API can change, and the package can be removed, without notice.

An [Agent Client Protocol](https://agentclientprotocol.com/) (ACP) v1 adapter for [assistant-ui](https://www.assistant-ui.com/). Point it at an agent that already speaks ACP and the agent drives an assistant-ui thread. The protocol client, the thread controller and the conversions are framework-agnostic; React enters only through `useAcpRuntime` and the extras hooks.

The client speaks ACP v1 as JSON-RPC over a single WebSocket that carries traffic in both directions. ACP has finalized only the stdio transport, and its streamable HTTP and WebSocket transports are still drafts, so this is a custom transport that the agent or a bridge in front of it has to expose. The wire types come from the official [`@agentclientprotocol/sdk`](https://www.npmjs.com/package/@agentclientprotocol/sdk) schema, imported as types only.

## Usage

```tsx
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAcpRuntime } from "@assistant-ui/acp";

export function App() {
  const runtime = useAcpRuntime({
    url: "ws://127.0.0.1:2770/",
    cwd: "/home/me/project",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* your thread UI, e.g. the shadcn kit's <Thread /> */}
    </AssistantRuntimeProvider>
  );
}
```

### Options

| Option             | Description                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `url`              | WebSocket endpoint of the ACP agent (`ws://` or `wss://`).                                                |
| `cwd`              | Absolute working directory on the agent's host, required with `url`. The agent roots its file tools here. |
| `client`           | A prebuilt `AcpClient`, used instead of `url` and `cwd`.                                                  |
| `mcpServers`       | MCP servers passed to `session/new` and `session/load`.                                                   |
| `clientInfo`       | Client identity for the `initialize` handshake.                                                           |
| `permissions`      | `"ask"` (default) shows approval UI; `"auto-allow"` picks the agent's first allow option.                 |
| `autoConnect`      | Connect and run `initialize` on mount (default `true`).                                                   |
| `webSocketFactory` | Inject a WebSocket implementation (tests, proxies).                                                       |
| `onError`          | Error callback (connection failures, prompt errors, withheld attachments).                                |
| `onCancel`         | Called after a run has been cancelled.                                                                    |

### Bringing your own `AcpClient`

Pass `client` to configure the transport yourself, not to share one connection between runtimes: an `AcpClient` holds exactly one ACP session, so two runtimes on one client would prompt the same session and each show only its own half of the conversation. Give each runtime its own client.

The runtime subscribes to the client (`subscribeSessionUpdate`, `subscribeConnectionChange`, `registerPermissionHandler`) and unsubscribes when it unmounts, so your own listeners keep working alongside it. Permission requests go to the `permissionHandler` the client was constructed with when there is one, otherwise to the most recently registered handler, and are refused when neither exists.

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

## How ACP maps onto assistant-ui

| ACP                                        | assistant-ui                                               |
| ------------------------------------------ | ---------------------------------------------------------- |
| WebSocket connection and `initialize`      | runtime connection state (`useAcpConnectionState`)         |
| a session from `session/new`               | the thread (`useAcpSessionId`); New Thread opens a new one |
| `session/prompt` and `session/cancel`      | run and cancel                                             |
| `agent_message_chunk`                      | text part (streamed)                                       |
| `agent_thought_chunk`                      | reasoning part (streamed)                                  |
| `tool_call` and `tool_call_update`         | tool-call part                                             |
| `session/request_permission`               | tool-call approval (`requires-action` until answered)      |
| stop reason                                | message status                                             |
| `plan`                                     | `useAcpPlan`                                               |
| `session_info_update`                      | `useAcpSessionTitle`                                       |
| `modes` and `current_mode_update`          | `useAcpCurrentModeId`                                      |
| `available_commands_update`                | `useAcpAvailableCommands`                                  |
| `configOptions` and `config_option_update` | `useAcpConfigOptions`                                      |
| `usage_update`                             | `useAcpUsage`                                              |
| `agentInfo` and `agentCapabilities`        | `useAcpAgentInfo` and `useAcpAgentCapabilities`            |

A tool call's `toolName` is the key apps register tool UIs against, so it stays stable for the life of the call: the protocol's programmatic `name` when the agent sends one, then its `kind` (`read`, `edit`, `execute` and so on), and only then the human-readable `title`. A `tool_call_update` carries only what changed, so the call's `name`, `kind`, `title`, `status` and `locations` accumulate on the part as `providerMetadata.acp`, where a renderer can read the label and the agent's own status. The result is the call's `rawOutput`, or the text of its `content`, and stays preliminary until the agent reports `completed` or `failed`.

`end_turn` completes the message; `cancelled`, `max_tokens`, `refusal` and `max_turn_requests` leave it incomplete (`cancelled`, `length`, `content-filter` and `other`).

Browser clients advertise no filesystem or terminal capabilities, so a conforming agent never sends `fs/*` or `terminal/*` requests; any such request is answered with JSON-RPC `-32601`.

## Limitations

**The agent owns the transcript.** An ACP v1 session's history lives on the agent and can only be appended to, so the runtime offers no edit, reload, delete or branch switching, takes no `adapters.history`, and ignores one a thread list provides through `RuntimeAdapterProvider`. Each of those would change what the thread shows without changing what the agent holds. Persisting the ACP session id with a thread and restoring it with `session/load` is what would make restored threads real.

**A dropped connection cannot silently continue the thread.** On reconnect the client restores the lost session with `session/load` when `agentCapabilities.loadSession` advertises it, dropping the replay because the thread already shows it. Otherwise every prompt is rejected with an error naming the session, until New Thread (`switchToNewThread`) clears the transcript and opens a new session.

**Stopping a turn.** Stop sends `session/cancel`, ends the turn as cancelled, and keeps applying the tool call updates the agent sends until it answers the cancelled prompt. A message sent while another turn runs reaches the agent only after that turn settles. A turn stopped before its prompt went out never reaches the agent, while its message stays in the thread.

**Attachments the agent did not opt into are withheld.** ACP's baseline prompt content is text and resource links; `image`, `audio` and embedded `resource` blocks need `agentCapabilities.promptCapabilities`. An embedded resource keeps what survives (its text as a text block, or a URI the agent can fetch as a resource link), so only inline bytes behind a client-local `file:` URI are dropped, and `onError` reports every dropped block.

**MCP servers need the agent's support.** HTTP, SSE and ACP MCP servers are only sent to an agent whose `mcpCapabilities` advertise that transport; otherwise opening the session fails with an error naming the server.

**Not implemented yet.** `authenticate` (an agent that requires it fails `session/new` with its own error), `session/set_mode` and `session/set_config_option` (modes and config options are read-only), the ACP v1 updates the schema marks unstable, and the draft ACP v2 wire.

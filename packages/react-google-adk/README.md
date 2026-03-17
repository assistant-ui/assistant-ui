# @assistant-ui/react-google-adk

Google ADK (Agent Development Kit) adapter for [assistant-ui](https://www.assistant-ui.com/).

Connects Google ADK JS agents to assistant-ui's React runtime with streaming, tool calls, multi-agent support, tool confirmations, auth flows, and session state management.

## Installation

```sh
npm install @assistant-ui/react @assistant-ui/react-google-adk
```

## Quick Start

### Proxy Mode (with a Next.js API Route)

**Server** (`app/api/adk/route.ts`):

```typescript
import { createAdkApiRoute } from "@assistant-ui/react-google-adk/server";
import { runner } from "./agent";

export const POST = createAdkApiRoute({
  runner,
  userId: "default-user",
  sessionId: (req) =>
    new URL(req.url).searchParams.get("sessionId") ?? "default",
});
```

**Client:**

```tsx
import { useAdkRuntime, createAdkStream } from "@assistant-ui/react-google-adk";

const runtime = useAdkRuntime({
  stream: createAdkStream({ api: "/api/adk" }),
});
```

### Direct Mode (connecting to an ADK server)

```tsx
import {
  useAdkRuntime,
  createAdkStream,
  createAdkSessionAdapter,
} from "@assistant-ui/react-google-adk";

const { adapter, load } = createAdkSessionAdapter({
  apiUrl: "http://localhost:8000",
  appName: "my-app",
  userId: "user-1",
});

const runtime = useAdkRuntime({
  stream: createAdkStream({
    api: "http://localhost:8000",
    appName: "my-app",
    userId: "user-1",
  }),
  sessionAdapter: adapter,
  load,
});
```

## API Reference

### Client Exports

#### `createAdkStream(options)`

Creates an `AdkStreamCallback` that connects to an ADK endpoint via SSE.

| Option | Type | Description |
|--------|------|-------------|
| `api` | `string` | URL to POST to (proxy route or ADK server base URL) |
| `appName` | `string?` | ADK app name (enables direct mode when set) |
| `userId` | `string?` | ADK user ID (required with `appName`) |
| `headers` | `Record<string, string> \| (() => ...)` | Static or dynamic request headers |

#### `createAdkSessionAdapter(options)`

Creates a `RemoteThreadListAdapter` backed by ADK's session REST API.

Returns `{ adapter, load }` where `load` reconstructs messages from session events.

| Option | Type | Description |
|--------|------|-------------|
| `apiUrl` | `string` | ADK server base URL |
| `appName` | `string` | ADK app name |
| `userId` | `string` | ADK user ID |
| `headers` | `Record<string, string> \| (() => ...)` | Static or dynamic request headers |

#### `useAdkRuntime(options)`

Main hook that creates a full `AssistantRuntime`.

| Option | Type | Description |
|--------|------|-------------|
| `stream` | `AdkStreamCallback` | Stream callback (use `createAdkStream`) |
| `sessionAdapter` | `RemoteThreadListAdapter?` | Alternative to `cloud` for thread persistence |
| `cloud` | `AssistantCloud?` | Cloud adapter for thread persistence |
| `load` | `(threadId: string) => Promise<{messages}>` | Load thread history |
| `autoCancelPendingToolCalls` | `boolean?` | Auto-cancel pending tools on new message (default: true) |
| `unstable_allowCancellation` | `boolean?` | Enable stream cancellation |
| `getCheckpointId` | `(threadId, messages) => Promise<string?>` | Enable edit/reload |
| `adapters` | `{attachments?, speech?, feedback?}` | Optional adapters |
| `eventHandlers` | `{onError?, onCustomEvent?, onAgentTransfer?}` | Event callbacks |

### Hooks

| Hook | Description |
|------|-------------|
| `useAdkAgentInfo()` | Current agent name and branch path |
| `useAdkSessionState()` | Accumulated session state delta |
| `useAdkSend()` | Send raw ADK messages |
| `useAdkLongRunningToolIds()` | Pending tool IDs awaiting input |
| `useAdkToolConfirmations()` | Tool confirmation requests |
| `useAdkAuthRequests()` | Auth credential requests |
| `useAdkArtifacts()` | Artifact delta (filename → version) |
| `useAdkEscalation()` | Escalation flag |
| `useAdkMessageMetadata()` | Per-message grounding/citation/usage |

### Server Exports (`/server`)

#### `createAdkApiRoute(options)`

One-liner API route handler combining request parsing and SSE streaming.

| Option | Type | Description |
|--------|------|-------------|
| `runner` | `AdkRunner` | ADK Runner instance |
| `userId` | `string \| (req) => string` | Static or dynamic user ID |
| `sessionId` | `string \| (req) => string` | Static or dynamic session ID |
| `onError` | `(error) => void` | Error handler |

#### `adkEventStream(events, options?)`

Converts an ADK event async generator into an SSE `Response`.

#### `parseAdkRequest(request)`

Parses an incoming HTTP request into a structured ADK request.

#### `toAdkContent(parsed)`

Converts a parsed request into a Google GenAI `Content` object.

## Documentation

See the [full documentation](https://www.assistant-ui.com/docs/runtimes/google-adk) for setup guides, advanced APIs, and examples.

## License

MIT

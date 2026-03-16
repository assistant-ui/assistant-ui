# @assistant-ui/react-google-adk

Google ADK (Agent Development Kit) adapter for [assistant-ui](https://www.assistant-ui.com/).

Connects Google ADK JS agents to assistant-ui's React runtime with streaming, tool calls, multi-agent support, and session state management.

## Installation

```sh
npm install @assistant-ui/react @assistant-ui/react-google-adk
```

## Quick Start

**Server:**

```typescript
import { adkEventStream, parseAdkRequest, toAdkContent } from "@assistant-ui/react-google-adk/server";

export async function POST(req: Request) {
  const parsed = await parseAdkRequest(req);
  const newMessage = toAdkContent(parsed);
  const events = runner.runAsync({ userId, sessionId, newMessage });
  return adkEventStream(events);
}
```

**Client:**

```tsx
import { useAdkRuntime } from "@assistant-ui/react-google-adk";

const runtime = useAdkRuntime({
  stream: async function* (messages, { abortSignal }) {
    const res = await fetch("/api/chat", { method: "POST", body: JSON.stringify({ message: "..." }), signal: abortSignal });
    // parse SSE and yield AdkEvent objects
  },
});
```

## Documentation

See the [full documentation](https://www.assistant-ui.com/docs/runtimes/google-adk) for setup guides, advanced APIs, and examples.

## License

MIT

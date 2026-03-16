# `@assistant-ui/react-a2a`

[A2A (Agent-to-Agent) v1.0](https://github.com/a2aproject/A2A) protocol adapter for [assistant-ui](https://www.assistant-ui.com/).

## Installation

```sh
npm install @assistant-ui/react @assistant-ui/react-a2a
```

## Quick Start

```tsx
import { AssistantRuntimeProvider, Thread } from "@assistant-ui/react";
import { useA2ARuntime } from "@assistant-ui/react-a2a";

function App() {
  const runtime = useA2ARuntime({
    baseUrl: "http://localhost:9999",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
```

## Documentation

Full documentation is available at [assistant-ui.com/docs/runtimes/a2a](https://www.assistant-ui.com/docs/runtimes/a2a).

## Features

- Full A2A v1.0 protocol support
- Built-in HTTP client with SSE streaming
- All 9 task states (including `input_required`, `auth_required`)
- Artifact streaming with append/lastChunk support
- Agent card discovery
- Multi-tenancy
- Structured error handling (google.rpc.Status)
- Push notification config CRUD
- Extension negotiation
- Streaming/non-streaming auto-fallback

## License

MIT

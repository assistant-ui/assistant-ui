# `@assistant-ui/react-a2a`

[A2A (Agent-to-Agent) v1.0](https://github.com/a2aproject/A2A) protocol integration for `@assistant-ui/react`. Built-in HTTP client with SSE streaming, agent-card discovery, multi-tenancy, and structured error handling.

## Installation

```bash
npm install @assistant-ui/react @assistant-ui/react-a2a
```

## Usage

```tsx
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useA2ARuntime } from "@assistant-ui/react-a2a";
import { Thread } from "@/components/assistant-ui/thread";

export function App() {
  const runtime = useA2ARuntime({ baseUrl: "http://localhost:9999" });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
```

Supports all 9 A2A task states (including `input_required` and `auth_required`), artifact streaming, push-notification config, extension negotiation, and streaming/non-streaming auto-fallback.

## See also

- `@assistant-ui/react-ag-ui` for the AG-UI protocol.
- `@assistant-ui/react-langgraph` for LangGraph agents.

Full reference at [assistant-ui.com/docs/runtimes/a2a](https://www.assistant-ui.com/docs/runtimes/a2a).

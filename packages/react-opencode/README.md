# `@assistant-ui/react-opencode`

[OpenCode](https://opencode.ai) runtime adapter for `@assistant-ui/react`. Maps OpenCode activity onto the standard assistant-ui message primitives so an OpenCode session can drive a Thread UI.

> [!NOTE]
> This integration is experimental. APIs may change between minor versions.

## Installation

```bash
npm install @assistant-ui/react @assistant-ui/react-opencode
```

## Usage

```tsx
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useOpenCodeRuntime } from "@assistant-ui/react-opencode";
import { Thread } from "@/components/assistant-ui/thread";

export function App() {
  const runtime = useOpenCodeRuntime({
    apiUrl: "http://localhost:4096",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
```

## See also

- `@assistant-ui/react-ai-sdk` for general-purpose Vercel AI SDK integration.
- `@assistant-ui/react-langgraph` for LangGraph agents.

Full reference at [assistant-ui.com/docs/runtimes/opencode](https://www.assistant-ui.com/docs/runtimes/opencode).

# `@assistant-ui/react-mastra`

Mastra thread persistence and workflow integration for assistant-ui.

```tsx
import { MastraClient } from "@mastra/client-js";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useMastraRuntime } from "@assistant-ui/react-mastra";

const client = new MastraClient({ baseUrl: "http://localhost:4111" });

export function RuntimeProvider({ children }: React.PropsWithChildren) {
  const runtime = useMastraRuntime({
    client,
    agentId: "assistant",
    resourceId: "user-1",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

The `/api/chat` route should use `chatRoute` from `@mastra/ai-sdk`. Chat
messages are persisted by Mastra while this package maps memory threads and
stored messages to assistant-ui's thread list and history contracts.

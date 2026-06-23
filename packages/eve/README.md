# @assistant-ui/eve

Eve runtime adapter for assistant-ui.

```tsx
"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useEveAgentRuntime } from "@assistant-ui/eve";

export function RuntimeProvider({ children }: { children: React.ReactNode }) {
  const runtime = useEveAgentRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

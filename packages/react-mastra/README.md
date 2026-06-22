# @assistant-ui/react-mastra

React runtime adapter for connecting assistant-ui to Mastra agents.

## Install

```bash
npm install @assistant-ui/react-mastra @mastra/core
```

Add Mastra memory/storage packages when your app needs persisted threads:

```bash
npm install @mastra/memory @mastra/libsql
```

## Usage

```tsx
"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useMastraRuntime } from "@assistant-ui/react-mastra";

export function MyRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const runtime = useMastraRuntime({
    api: "/api/chat",
    agentId: "chefAgent",
    memory: {
      userId: "default-user",
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

`api` should accept `agentId`, `messages`, `threadId`, `resourceId`, and
`runConfig`, then stream Mastra events as Server-Sent Events. You can provide a
custom `stream` callback instead of `api` when your app does not use HTTP.

## Exports

- `useMastraRuntime`
- `useMastraExtras`
- `useMastraMemory`
- `useMastraWorkflows`
- `useMastraWorkflowInterrupt`
- `createMastraFetchStream`
- `convertMastraMessage`
- `MastraMessageAccumulator`
- health helpers and public Mastra integration types

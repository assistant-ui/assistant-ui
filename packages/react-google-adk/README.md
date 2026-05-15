# `@assistant-ui/react-google-adk`

[Google ADK](https://github.com/google/adk-js) (Agent Development Kit) integration for `@assistant-ui/react`. Connects ADK JS agents to the assistant-ui runtime with streaming, tool calls, multi-agent support, tool confirmations, auth flows, and session-state management.

## Installation

```bash
npm install @assistant-ui/react @assistant-ui/react-google-adk @google/adk
```

## Usage

The recommended setup proxies through your own API route:

```ts
// app/api/adk/route.ts
import { createAdkApiRoute } from "@assistant-ui/react-google-adk/server";
import { runner } from "./agent";

export const POST = createAdkApiRoute({
  runner,
  userId: "default-user",
  sessionId: (req) => new URL(req.url).searchParams.get("sessionId") ?? "default",
});
```

```tsx
// client component
import { useAdkRuntime, createAdkStream } from "@assistant-ui/react-google-adk";

const runtime = useAdkRuntime({
  stream: createAdkStream({ api: "/api/adk" }),
});
```

Or connect directly to an ADK server with `createAdkSessionAdapter`; see the docs for the full setup and option reference.

## See also

- `@assistant-ui/react-langgraph` for LangGraph SDK agents.
- `@assistant-ui/react-ag-ui` for the AG-UI protocol.

Full reference for client hooks (`useAdkAgentInfo`, `useAdkSessionState`, `useAdkToolConfirmations`, `useAdkAuthRequests`, etc.), server exports, and direct mode at [assistant-ui.com/docs/runtimes/google-adk](https://www.assistant-ui.com/docs/runtimes/google-adk).

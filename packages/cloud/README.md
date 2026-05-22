# `assistant-cloud`

[![npm version](https://img.shields.io/npm/v/assistant-cloud)](https://www.npmjs.com/package/assistant-cloud)
[![npm downloads](https://img.shields.io/npm/dm/assistant-cloud)](https://www.npmjs.com/package/assistant-cloud)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

Server- and client-side SDK for [Assistant Cloud](https://cloud.assistant-ui.com), the managed thread-history, telemetry, and file-storage backend for `@assistant-ui/react`.

## Installation

```bash
npm install @assistant-ui/react @assistant-ui/react-ai-sdk assistant-cloud
```

## Usage

Pass an `AssistantCloud` instance to your runtime hook (typically `useChatRuntime` from `@assistant-ui/react-ai-sdk`):

```tsx
import { AssistantCloud, AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

const cloud = new AssistantCloud({
  baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
  anonymous: true,
});

export function Provider({ children }: { children: React.ReactNode }) {
  const runtime = useChatRuntime({ cloud });
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
```

## Authentication

| Mode             | Required fields                                         | Use case                              |
| ---------------- | ------------------------------------------------------- | ------------------------------------- |
| Anonymous        | `baseUrl`, `anonymous: true`                            | Demos and unauthenticated playgrounds.|
| JWT              | `baseUrl`, `authToken: () => Promise<string \| null>`   | Browser apps with their own auth.     |
| API key (server) | `apiKey`, `userId`, `workspaceId`                       | Server-side admin and data-plane jobs.|

For advanced persistence adapters and MCP sampling instrumentation, see the [docs](https://www.assistant-ui.com/docs/cloud).

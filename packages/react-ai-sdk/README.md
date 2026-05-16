# `@assistant-ui/react-ai-sdk`

[Vercel AI SDK](https://sdk.vercel.ai) v6 integration for `@assistant-ui/react`. Wraps the AI SDK chat in an assistant-ui runtime and forwards system messages and frontend tools through `AssistantChatTransport`.

## Installation

```bash
npm install @assistant-ui/react @assistant-ui/react-ai-sdk
```

## Usage

```tsx
"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

export function Chat() {
  const runtime = useChatRuntime();
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
```

`useChatRuntime` defaults to `AssistantChatTransport`, which forwards frontend system messages and tool definitions to your backend. To customize the API URL, the cache, or other transport settings, pass a configured `AssistantChatTransport` to keep that forwarding behavior; pass `DefaultChatTransport` to opt out.

Full reference at [assistant-ui.com/docs/runtimes/ai-sdk](https://www.assistant-ui.com/docs/runtimes/ai-sdk).

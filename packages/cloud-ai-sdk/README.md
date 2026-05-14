# `@assistant-ui/cloud-ai-sdk`

Standalone [Vercel AI SDK](https://sdk.vercel.ai) hooks backed by [Assistant Cloud](https://cloud.assistant-ui.com) persistence. Use this when you want managed thread history, auto-titling, and thread CRUD for an AI SDK chat app without pulling in `@assistant-ui/react`.

If you are already using `@assistant-ui/react`, install `@assistant-ui/react-ai-sdk` and pass an `AssistantCloud` instance instead.

## Installation

```bash
npm install @assistant-ui/cloud-ai-sdk assistant-cloud ai @ai-sdk/react
```

## Usage

```tsx
"use client";

import { useCloudChat } from "@assistant-ui/cloud-ai-sdk";

export function Chat() {
  const { messages, sendMessage, threadId } = useCloudChat();
  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>{m.content}</div>
      ))}
      <button onClick={() => sendMessage({ text: "Hello" })}>Send</button>
    </div>
  );
}
```

Set `NEXT_PUBLIC_ASSISTANT_BASE_URL` for zero-config, or pass an explicit `cloud` instance: `useCloudChat({ cloud })`. Pair with `useThreads` for thread CRUD and selection.

Full reference at [assistant-ui.com/docs/cloud/ai-sdk](https://www.assistant-ui.com/docs/cloud/ai-sdk).

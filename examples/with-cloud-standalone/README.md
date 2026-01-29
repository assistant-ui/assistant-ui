# Cloud Persistence for AI SDK (Standalone)

Lightweight cloud persistence for AI SDK apps without assistant-ui components.

> **Want the full assistant-ui experience?** See [with-cloud](../with-cloud) instead, which uses `useChatRuntime` with `<Thread />` and other primitives.

## Setup

1. Get your project URL from [cloud.assistant-ui.com](https://cloud.assistant-ui.com)
2. Add to `.env`:
   ```
   NEXT_PUBLIC_ASSISTANT_BASE_URL=https://your-project.assistant-api.com
   OPENAI_API_KEY=sk-...
   ```

## Usage

```tsx
import { AssistantCloud } from "assistant-cloud";
import { useCloudChat, useThreads } from "assistant-cloud/ai-sdk";

const cloud = new AssistantCloud({
  baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
  anonymous: true,
});

function Chat() {
  const threads = useThreads({ cloud });
  const chat = useCloudChat({ threads });

  // chat.messages, chat.sendMessage, etc.
  // threads.threadId, threads.selectThread, threads.generateTitle, etc.
}
```

Messages persist automatically. Thread creation is handled automatically when you send the first message — the thread is created, selected, and the list is refreshed. Call `threads.selectThread(id)` to switch threads, `threads.selectThread(null)` for a new chat.

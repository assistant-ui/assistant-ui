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

### Zero-config (anonymous users)

```tsx
import { useCloudChat } from "assistant-cloud/ai-sdk";

function Chat() {
  // Auto-initializes anonymous cloud from NEXT_PUBLIC_ASSISTANT_BASE_URL
  const { messages, sendMessage, threads } = useCloudChat();
  // ...
}
```

### With custom cloud instance (authenticated users)

```tsx
import { AssistantCloud } from "assistant-cloud";
import { useCloudChat } from "assistant-cloud/ai-sdk";

function Chat() {
  const cloud = useMemo(() => new AssistantCloud({
    baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
    authToken: async () => getToken(),
  }), [getToken]);

  const { messages, sendMessage, threads } = useCloudChat({ cloud });
  // ...
}
```

### With thread configuration

```tsx
const { messages, sendMessage, threads } = useCloudChat({
  threads: {
    includeArchived: true,      // Show archived threads in list
    autoGenerateTitle: false,   // Disable auto-title generation
  },
  onSyncError: (err) => console.error("Sync failed:", err),
});
```

### With external thread management

When you need thread operations in a separate component (e.g., a sidebar):

```tsx
// In parent or context
const myThreads = useThreads({ cloud });

// In chat component - uses your thread state
const { messages, sendMessage } = useCloudChat({ threads: myThreads });

// In sidebar component - same thread state
<ThreadList threads={myThreads.threads} onSelect={myThreads.selectThread} />
```

## How it works

Messages persist automatically as they complete. Thread creation is handled automatically when you send the first message — the thread is created, selected, and the list is refreshed. Call `threads.selectThread(id)` to switch threads, `threads.selectThread(null)` for a new chat.

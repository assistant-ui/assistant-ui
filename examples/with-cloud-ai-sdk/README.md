# AI SDK + Assistant Cloud

Persist AI SDK chat messages to the cloud with two hooks.

## Setup

1. Get your project URL from [cloud.assistant-ui.com](https://cloud.assistant-ui.com)
2. Add to `.env`:
   ```
   NEXT_PUBLIC_ASSISTANT_BASE_URL=https://your-project.assistant-api.com
   OPENAI_API_KEY=sk-...
   ```

## Usage

```tsx
const cloud = new AssistantCloud({
  baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
  anonymous: true,
});

function Chat() {
  // your existing AI SDK chat
  const chat = useChat();

  // syncs chat.messages to cloud, returns current thread ID + switcher
  const [threadId, selectThread] = useSync(cloud, chat);

  // thread history — threads.list, threads.delete(id), threads.rename(id, title)
  const threads = useThreads(cloud);
}
```

Messages persist automatically. Call `selectThread(id)` to switch threads, `selectThread(null)` for a new chat.

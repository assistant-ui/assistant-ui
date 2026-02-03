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
import { useState } from "react";
import { useCloudChat } from "assistant-cloud/ai-sdk";

function Chat() {
  // Auto-creates anonymous cloud instance from env var
  const { messages, sendMessage, threads } = useCloudChat();
  const [input, setInput] = useState("");

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (!input.trim()) return;
      sendMessage({ text: input });
      setInput("");
    }}>
      {messages.map((m) => (
        <div key={m.id}>{m.parts.map((p) => p.type === "text" && p.text)}</div>
      ))}
      <input value={input} onChange={(e) => setInput(e.target.value)} />
    </form>
  );
}
```

Messages persist automatically. Thread creation is handled automatically when you send the first message — the thread is created, selected, and the list is refreshed. Call `threads.selectThread(id)` to switch threads, `threads.selectThread(null)` for a new chat.

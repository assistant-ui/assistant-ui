# `assistant-ui`

`assistant-ui` is a set of React components for AI chat.

- [Discord](https://discord.gg/S9dwgCNEFs)
- [Website](https://assistant-ui.com/)
- [Demo](https://assistant-ui-rsc-example.vercel.app/)

## Documentation

- [Documentation](https://www.assistant-ui.com/docs/getting-started)

## Minimal Example with Vercel AI SDK

```sh
npx assistant-ui@latest add assistant-modal
```

```tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider, useVercelUseChatRuntime } from "@assistant-ui/react";
import { AssistantModal } from "@/components/ui/assistant-ui/assistant-modal";

export default const MyApp = () => {
  const chat = useChat({ 
    api: "/api/chat" // your backend route
  });
  const runtime = useVercelUseChatRuntime(chat);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantModal />
    </AssistantRuntimeProvider>
  );
}
```
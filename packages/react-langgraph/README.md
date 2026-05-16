# `@assistant-ui/react-langgraph`

[LangGraph](https://langchain-ai.github.io/langgraph/) integration for `@assistant-ui/react`. Wraps a LangGraph stream in an assistant-ui runtime with thread persistence, interrupts, and message-tuple events.

## Installation

```bash
npm install @assistant-ui/react @assistant-ui/react-langgraph @langchain/langgraph-sdk
```

## Usage

```tsx
"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useLangGraphRuntime } from "@assistant-ui/react-langgraph";
import { createThread, sendMessage, getThreadState } from "@/lib/chatApi";

export function Provider({ children }: { children: React.ReactNode }) {
  const runtime = useLangGraphRuntime({
    stream: async function* (messages, { initialize, ...config }) {
      const { externalId } = await initialize();
      yield* sendMessage({ threadId: externalId!, messages, config });
    },
    create: async () => {
      const { thread_id } = await createThread();
      return { externalId: thread_id };
    },
    load: async (externalId) => {
      const state = await getThreadState(externalId);
      return { messages: state.values.messages ?? [], interrupts: [] };
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

## See also

- `@assistant-ui/react-langchain` targets `@langchain/react`'s `useStream`; pick it if that's the SDK you already use.

Full API reference at [assistant-ui.com/docs/runtimes/langgraph](https://www.assistant-ui.com/docs/runtimes/langgraph). See [`examples/with-langgraph`](https://github.com/assistant-ui/assistant-ui/tree/main/examples/with-langgraph) for a complete app.

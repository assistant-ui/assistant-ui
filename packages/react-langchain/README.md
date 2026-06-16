# `@assistant-ui/react-langchain`

Adapter that wraps [`useStream`](https://docs.langchain.com/oss/javascript/langgraph-sdk/react-stream) from `@langchain/react` and exposes it as an assistant-ui runtime. Bridges LangChain's `useStream` to an `AssistantRuntime` with hooks for interrupts, raw state submission, and reading custom LangGraph state keys.

## When to use this

assistant-ui also ships `@assistant-ui/react-langgraph`, which integrates with `@langchain/langgraph-sdk` directly and has a broader feature set (subgraph events, UI messages, message metadata, cancellation). The two packages are independent adapters targeting different upstream libraries; pick whichever matches the SDK you already use.

## Installation

```bash
npm install @assistant-ui/react @assistant-ui/react-langchain @langchain/react
```

## Usage

```tsx
import { useStreamRuntime } from "@assistant-ui/react-langchain";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";

export function App() {
  const runtime = useStreamRuntime({
    assistantId: "agent",
    apiUrl: "http://localhost:2024",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
```

`useStreamRuntime` accepts every option `@langchain/react`'s `useStream` does, plus `cloud` for thread persistence, an `adapters` bag, and a `messagesKey` override.

Full reference for `useLangChainState`, `useLangChainInterruptState`, `useLangChainError`, `useLangChainSubmit`, and `convertLangChainBaseMessage` at [assistant-ui.com/docs/runtimes/langchain](https://www.assistant-ui.com/docs/runtimes/langchain).

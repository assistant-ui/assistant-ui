## `@assistant-ui/react-langchain`

Adapter that wraps [`useStream`](https://docs.langchain.com/oss/javascript/langgraph-sdk/react-stream) from `@langchain/react` and exposes it as an assistant-ui runtime, with hooks for reading interrupts, submitting raw state updates, and reading arbitrary LangGraph custom state keys.

> assistant-ui also ships [`@assistant-ui/react-langgraph`](https://www.npmjs.com/package/@assistant-ui/react-langgraph), which integrates with `@langchain/langgraph-sdk` directly and has a broader feature set (subgraph events, UI messages, message metadata, cancellation). The two packages are independent adapters targeting different upstream libraries — pick whichever matches your upstream choice. See the [comparison](https://www.assistant-ui.com/docs/runtimes/langchain/comparison).

## Features

- Bridges LangChain's `useStream` to an assistant-ui `AssistantRuntime`
- Tool invocations flow through assistant-ui's `useToolInvocations`
- `useLangChainInterruptState` — read the current LangGraph interrupt
- `useLangChainSubmit` — submit raw state updates (e.g. resume commands)
- `useLangChainState<T>(key)` — read custom state keys like `todos` / `files` reactively
- Optional assistant-cloud thread persistence

## Installation

```bash
npm install @assistant-ui/react @assistant-ui/react-langchain @langchain/react
```

## Usage

### Basic setup

```tsx
import { useStreamRuntime } from "@assistant-ui/react-langchain";
import { AssistantRuntimeProvider, Thread } from "@assistant-ui/react";

function App() {
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

`useStreamRuntime` accepts every option `useStream` from `@langchain/react` does, plus:

- `cloud` — an `AssistantCloud` instance for persisting threads
- `adapters` — `{ attachments, speech, feedback }`
- `messagesKey` — the state key that holds messages (default `"messages"`)

### Reading custom state keys

LangGraph agents often expose structured state beyond messages (plans, todos, scratch files, generative-UI artifacts). Read them directly with `useLangChainState` — mirrors `useStream().values[key]` upstream and updates when the stream emits new state.

```tsx
import { useLangChainState } from "@assistant-ui/react-langchain";

type Todo = { id: string; title: string; done: boolean };

function TodoList() {
  const todos = useLangChainState<Todo[]>("todos", []);

  return (
    <ul>
      {todos.map((t) => (
        <li key={t.id}>{t.title}</li>
      ))}
    </ul>
  );
}
```

Signatures:

```ts
useLangChainState<T>(key: string): T | undefined;
useLangChainState<T>(key: string, defaultValue: T): T;
```

### Interrupts

```tsx
import {
  useLangChainInterruptState,
  useLangChainSubmit,
} from "@assistant-ui/react-langchain";
import { Command } from "@langchain/langgraph-sdk";

function InterruptPrompt() {
  const interrupt = useLangChainInterruptState();
  const submit = useLangChainSubmit();

  if (!interrupt) return null;

  return (
    <div>
      <pre>{JSON.stringify(interrupt.value, null, 2)}</pre>
      <button onClick={() => submit(null, { command: new Command({ resume: "yes" }) })}>
        Approve
      </button>
    </div>
  );
}
```

### Message conversion

The adapter ships `convertLangChainBaseMessage` for cases where you want to reuse the internal converter directly (e.g. when building a custom `ExternalStoreAdapter`).

```ts
import { convertLangChainBaseMessage } from "@assistant-ui/react-langchain";
```

# @assistant-ui/react-ink

React Ink (terminal UI) bindings for [assistant-ui](https://www.assistant-ui.com/).

Build AI chat interfaces for the terminal using [Ink](https://github.com/vadimdemedes/ink) — React for CLIs — powered by the same runtime as assistant-ui.

## Installation

```sh
npm install @assistant-ui/react-ink ink react
```

## Quick Start

```tsx
import { render } from "ink";
import { Box, Text } from "ink";
import {
  AssistantProvider,
  useLocalRuntime,
  ThreadRoot,
  ThreadMessages,
  ComposerInput,
  type ChatModelAdapter,
} from "@assistant-ui/react-ink";

const myAdapter: ChatModelAdapter = {
  async *run({ messages }) {
    // your AI backend here
    yield { content: [{ type: "text", text: "Hello from AI!" }] };
  },
};

function App() {
  const runtime = useLocalRuntime(myAdapter);

  return (
    <AssistantProvider runtime={runtime}>
      <ThreadRoot>
        <ThreadMessages
          renderMessage={({ message }) => (
            <Box marginBottom={1}>
              <Text>
                {message.content
                  .filter((p) => p.type === "text")
                  .map((p) => p.text)
                  .join("")}
              </Text>
            </Box>
          )}
        />
        <ComposerInput submitOnEnter placeholder="Message..." autoFocus />
      </ThreadRoot>
    </AssistantProvider>
  );
}

render(<App />);
```

## Features

- Composable, unstyled primitives (Thread, Composer, Message, ActionBar, etc.)
- Streaming responses with real-time updates
- Tool call support with built-in ToolFallback component
- Diff rendering with DiffPrimitive components and DiffView for unified diffs and file comparisons in the terminal
- Message branching and editing
- Multi-thread support with thread list management
- Markdown rendering via `@assistant-ui/react-ink-markdown`
- Same runtime as `@assistant-ui/react` — share adapters, tools, and backend code

## Documentation

- [Getting Started](https://www.assistant-ui.com/docs/ink)
- [Migration from Web](https://www.assistant-ui.com/docs/ink/migration)
- [Primitives](https://www.assistant-ui.com/docs/ink/primitives)
- [Hooks](https://www.assistant-ui.com/docs/ink/hooks)

## Related Packages

- [`@assistant-ui/react-ink-markdown`](https://www.npmjs.com/package/@assistant-ui/react-ink-markdown) — Terminal markdown rendering with syntax highlighting
- [`@assistant-ui/react`](https://www.npmjs.com/package/@assistant-ui/react) — Web (React) bindings
- [`@assistant-ui/react-native`](https://www.npmjs.com/package/@assistant-ui/react-native) — React Native bindings

## License

MIT

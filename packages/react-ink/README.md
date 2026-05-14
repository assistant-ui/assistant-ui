# `@assistant-ui/react-ink`

[![npm version](https://img.shields.io/npm/v/@assistant-ui/react-ink)](https://www.npmjs.com/package/@assistant-ui/react-ink)
[![npm downloads](https://img.shields.io/npm/dm/@assistant-ui/react-ink)](https://www.npmjs.com/package/@assistant-ui/react-ink)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)
![License](https://img.shields.io/npm/l/@assistant-ui/react-ink)

[Ink](https://github.com/vadimdemedes/ink) bindings for assistant-ui. Composable, unstyled terminal primitives that share the same runtime, adapters, and tools as `@assistant-ui/react`, so you can ship a CLI chat UI without rewriting your backend code.

## Installation

Requires React 19 and ink 6 or newer.

```bash
npm install @assistant-ui/react-ink ink react
```

For markdown rendering with syntax highlighting, also install [`@assistant-ui/react-ink-markdown`](https://www.npmjs.com/package/@assistant-ui/react-ink-markdown).

## Usage

```tsx
import { render, Box, Text } from "ink";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  ThreadPrimitive,
  ComposerPrimitive,
  useAuiState,
  type ChatModelAdapter,
} from "@assistant-ui/react-ink";

const adapter: ChatModelAdapter = {
  async *run({ messages }) {
    yield { content: [{ type: "text", text: "Hello from AI!" }] };
  },
};

const Message = () => {
  const message = useAuiState((s) => s.message);
  const text = message.content.find((p) => p.type === "text")?.text ?? "";
  return (
    <Box marginBottom={1}>
      <Text color={message.role === "user" ? "green" : "blue"}>
        {message.role === "user" ? "You: " : "AI: "}
      </Text>
      <Text>{text}</Text>
    </Box>
  );
};

const App = () => {
  const runtime = useLocalRuntime(adapter);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root>
        <ThreadPrimitive.Messages>{() => <Message />}</ThreadPrimitive.Messages>
        <Box borderStyle="round" paddingX={1}>
          <Text>{"> "}</Text>
          <ComposerPrimitive.Input submitOnEnter placeholder="Message..." autoFocus />
        </Box>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
};

render(<App />);
```

## Documentation

- [Getting Started](https://www.assistant-ui.com/docs/ink)
- [Migration from Web](https://www.assistant-ui.com/docs/ink/migration)
- [Primitives](https://www.assistant-ui.com/docs/ink/primitives)
- [Hooks](https://www.assistant-ui.com/docs/ink/hooks)

## For other platforms

- Web: [`@assistant-ui/react`](https://www.npmjs.com/package/@assistant-ui/react)
- React Native: [`@assistant-ui/react-native`](https://www.npmjs.com/package/@assistant-ui/react-native)

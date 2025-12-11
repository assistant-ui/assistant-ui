# assistant-ui Expo Example

A minimal React Native chat interface using `@assistant-ui/react-native`.

## Features

- Simple chat UI with message bubbles
- Text input with send button
- Dark mode support
- Simulated AI responses for demo purposes

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the Expo development server:
   ```bash
   pnpm start
   ```

3. Run on your preferred platform:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## Project Structure

```
app/
├── _layout.tsx      # Root layout with navigation
└── index.tsx        # Main chat screen

components/
├── chat/
│   ├── ChatScreen.tsx    # Main chat container
│   ├── ChatComposer.tsx  # Text input and send button
│   └── MessageBubble.tsx # Message display component
├── themed-text.tsx       # Themed text component
└── themed-view.tsx       # Themed view component

hooks/
├── use-chat-runtime.ts   # Chat runtime with message handling
├── use-color-scheme.ts   # Color scheme hook
└── use-theme-color.ts    # Theme color hook
```

## Using @assistant-ui/react-native

This example demonstrates how to use the core hooks from `@assistant-ui/react-native`:

```tsx
import {
  ThreadProvider,
  ComposerProvider,
  useThread,
  useComposer,
} from "@assistant-ui/react-native";

function ChatScreen() {
  const { threadRuntime, composerRuntime } = useChatRuntime();

  return (
    <ThreadProvider runtime={threadRuntime}>
      <ComposerProvider runtime={composerRuntime}>
        <Messages />
        <Composer />
      </ComposerProvider>
    </ThreadProvider>
  );
}

function Messages() {
  const messages = useThread((state) => state.messages);
  // Render messages...
}

function Composer() {
  const text = useComposer((state) => state.text);
  const canSend = useComposer((state) => state.canSend);
  // Render composer...
}
```

## License

MIT

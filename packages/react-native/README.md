# @assistant-ui/react-native

React Native hooks for building AI chat interfaces with assistant-ui.

## Installation

```bash
npm install @assistant-ui/react-native @assistant-ui/core
# or
yarn add @assistant-ui/react-native @assistant-ui/core
# or
pnpm add @assistant-ui/react-native @assistant-ui/core
```

## Overview

This package provides React hooks for managing AI chat state in React Native applications. It offers a framework-agnostic approach that works with any React Native UI library.

**Note:** This package only provides hooks and context - no UI components. You'll need to build your own UI components using the hooks provided.

## Usage

### Setting up Context Providers

```tsx
import { ThreadProvider, ComposerProvider } from '@assistant-ui/react-native';

function App() {
  // Create your runtime implementation
  const threadRuntime = useMyThreadRuntime();
  const composerRuntime = useMyComposerRuntime();

  return (
    <ThreadProvider runtime={threadRuntime}>
      <ComposerProvider runtime={composerRuntime}>
        <ChatScreen />
      </ComposerProvider>
    </ThreadProvider>
  );
}
```

### Using Hooks

```tsx
import {
  useThread,
  useThreadMessages,
  useThreadIsRunning,
  useComposer,
  useComposerSend,
} from '@assistant-ui/react-native';

function ChatScreen() {
  const messages = useThreadMessages();
  const isRunning = useThreadIsRunning();
  const { text } = useComposer();
  const { send, canSend } = useComposerSend();

  return (
    <View>
      <FlatList
        data={messages}
        renderItem={({ item }) => <MessageItem message={item} />}
      />
      <TextInput value={text} onChangeText={setText} />
      <Button title="Send" onPress={send} disabled={!canSend} />
    </View>
  );
}
```

## Available Hooks

### Runtime Hooks
- `useThreadRuntime()` - Access the thread runtime for actions
- `useMessageRuntime()` - Access the message runtime for actions
- `useComposerRuntime()` - Access the composer runtime for actions
- `useContentPartRuntime()` - Access the content part runtime

### State Hooks
- `useThread(selector?)` - Subscribe to thread state
- `useMessage(selector?)` - Subscribe to message state
- `useComposer(selector?)` - Subscribe to composer state
- `useContentPart(selector?)` - Subscribe to content part state

### Primitive Hooks
- `useThreadMessages()` - Get the list of messages
- `useThreadIsRunning()` - Check if the thread is running
- `useThreadIsEmpty()` - Check if the thread is empty
- `useComposerSend()` - Send the current composition
- `useComposerCancel()` - Cancel the current run
- `useMessageReload()` - Reload a message
- `useMessageBranching()` - Branch navigation controls

## Context Providers

- `ThreadProvider` - Provides thread context
- `MessageProvider` - Provides message context
- `ComposerProvider` - Provides composer context
- `ContentPartProvider` - Provides content part context
- `AssistantProvider` - Top-level provider (optional)

## Re-exported from @assistant-ui/core

This package re-exports commonly used types and utilities from `@assistant-ui/core`:

### Types
- `ThreadMessage`, `ThreadUserMessage`, `ThreadAssistantMessage`, `ThreadSystemMessage`
- `MessageStatus`, `MessagePartStatus`
- `TextMessagePart`, `ImageMessagePart`, `ToolCallMessagePart`, etc.
- `Attachment`, `PendingAttachment`, `CompleteAttachment`

### Utilities
- `MessageRepository` - For managing message trees
- `generateId`, `generateOptimisticId`, `isOptimisticId`
- `getThreadMessageText`

## License

MIT


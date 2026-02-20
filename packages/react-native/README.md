# `@assistant-ui/react-native`

React Native bindings for assistant-ui.

## Features

- Native React Native primitives (Thread, Composer, Message, ThreadList)
- Multi-thread support with in-memory thread list
- Compatible with `@assistant-ui/core` runtime system

## Usage

```typescript
import { useLocalRuntime, AssistantProvider, ThreadProvider, ComposerProvider } from '@assistant-ui/react-native';

function App() {
  const runtime = useLocalRuntime(chatModelAdapter);

  return (
    <AssistantProvider runtime={runtime}>
      <ThreadProvider runtime={runtime.thread}>
        <ComposerProvider runtime={runtime.thread.composer}>
          {/* Your chat UI */}
        </ComposerProvider>
      </ThreadProvider>
    </AssistantProvider>
  );
}
```

# `@assistant-ui/react-ai-sdk`

Vercel AI SDK integration for `@assistant-ui/react`.

## Features

- Seamless integration with Vercel AI SDK v5
- Automatic system message and frontend tools forwarding via `AssistantChatTransport`
- Support for custom transport configuration

## Usage

### Basic Setup

```typescript
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';
import { AssistantRuntimeProvider } from '@assistant-ui/react';

function App() {
  // By default, uses AssistantChatTransport which forwards system messages and tools
  const runtime = useChatRuntime();
  
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* Your assistant UI components */}
    </AssistantRuntimeProvider>
  );
}
```

### Custom Transport

If you need to use a different transport (e.g., to disable system/tools forwarding):

```typescript
import { DefaultChatTransport } from 'ai';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';

const runtime = useChatRuntime({
  transport: new DefaultChatTransport() // Standard AI SDK transport without forwarding
});
```

## AssistantChatTransport vs DefaultChatTransport

- **AssistantChatTransport** (default): Automatically forwards system messages and frontend tools from the Assistant UI context to your backend API
- **DefaultChatTransport**: Standard AI SDK transport without automatic forwarding

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

When you need to customize the transport configuration:

```typescript
import { DefaultChatTransport } from "ai";
import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

// Custom API URL while keeping system/tools forwarding
const runtime = useChatRuntime({
  transport: new AssistantChatTransport({
    api: "/my-custom-api/chat",
  }),
});

// Or disable system/tools forwarding entirely
const runtime = useChatRuntime({
  transport: new DefaultChatTransport(),
});
```

**Important:** When customizing the API URL, you must explicitly use `AssistantChatTransport` to keep frontend system messages and tools forwarding.

## AssistantChatTransport vs DefaultChatTransport

- **AssistantChatTransport** (default): Automatically forwards system messages and frontend tools from the Assistant UI context to your backend API
- **DefaultChatTransport**: Standard AI SDK transport without automatic forwarding

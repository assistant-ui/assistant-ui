# `@assistant-ui/react-ai-sdk`

Vercel AI SDK integration for `@assistant-ui/react`.

## Features

- Seamless integration with Vercel AI SDK v5
- Automatic system message and frontend tools forwarding via `AssistantChatTransport`
- Support for custom transport configuration
- Dynamic request body that updates with React state

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
      {/* Your assistant-ui components */}
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

### Dynamic Body

Pass extra data to the API request that updates dynamically with React state:

```typescript
const [temperature, setTemperature] = useState(0.7);

const runtime = useChatRuntime({
  body: { temperature },
});

// When temperature changes, the next request will use the new value
```

You can also use an async callback for values that need to be fetched:

```typescript
const runtime = useChatRuntime({
  body: async () => ({ authToken: await getToken() }),
});
```

The `body` option works with custom `AssistantChatTransport` as well:

```typescript
const runtime = useChatRuntime({
  transport: new AssistantChatTransport({ api: "/custom-api" }),
  body: { temperature },
});
```

**Merge Order:** The request body is merged in the following order (later values override earlier ones):

1. `contextBody` - Framework-managed fields (`callSettings`, `system`, `tools` from model context)
2. `options.body` - Body from useChat options
3. `body` option - Your dynamic body (highest precedence)

> **Note:** The `body` option can override framework-managed fields like `system` and `callSettings`. Use with care if you need to preserve model context settings.

## AssistantChatTransport vs DefaultChatTransport

- **AssistantChatTransport** (default): Automatically forwards system messages and frontend tools from the assistant-ui context to your backend API
- **DefaultChatTransport**: Standard AI SDK transport without automatic forwarding

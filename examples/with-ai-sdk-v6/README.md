# AI SDK v6 Example

This example demonstrates how to use `@assistant-ui/react-ai-sdk` with the Vercel AI SDK v6.

## Quick Start

### Using CLI (Recommended)

```bash
npx assistant-ui@latest create my-app --example with-ai-sdk-v6
cd my-app
```

### Environment Variables

Create `.env.local`:

```
ANTHROPIC_API_KEY=your-api-key-here
```

### Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## Key Features

- Uses the new AI SDK v6 with `@ai-sdk/react` and `@ai-sdk/anthropic`
- Integrates with `@assistant-ui/react` using the new `useChatRuntime` hook
- No RSC support (client-side only)
- Simplified integration with the `useChatRuntime` hook that wraps AI SDK v6's `useChat`
- Automatically uses `AssistantChatTransport` to pass system messages and frontend tools to the backend

## Custom Transport Configuration

By default, `useChatRuntime` uses `AssistantChatTransport` which automatically forwards system messages and frontend tools to the backend.

### Custom API URL with Forwarding

When customizing the API URL, you must explicitly use `AssistantChatTransport` to keep system/tools forwarding:

```typescript
import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";

const runtime = useChatRuntime({
  transport: new AssistantChatTransport({
    api: "/my-custom-api/chat", // Custom URL with system/tools forwarding
  }),
});
```

### Disable System/Tools Forwarding

To use the standard AI SDK transport without forwarding:

```typescript
import { DefaultChatTransport } from "ai";

const runtime = useChatRuntime({
  transport: new DefaultChatTransport(), // No system/tools forwarding
});
```

## API Route

The API route at `/api/chat` uses the new `streamText` function from AI SDK v6 to handle chat completions.

## Related Documentation

- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [AI SDK Integration Guide](https://www.assistant-ui.com/docs/runtimes/ai-sdk)

## Internal Component-Part Storytelling

- [Internal Component Part Lab Story Guide](./app/internal/component-lab/README.md)
- Live demo surface: `/internal/component-lab`

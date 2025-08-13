# AI SDK v5 Example

This example demonstrates how to use `@assistant-ui/react-ai-sdk-v5` with the Vercel AI SDK v5.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up your environment variables:

```bash
cp .env.example .env.local
```

Add your Anthropic API key to `.env.local`:

```
ANTHROPIC_API_KEY=your-api-key-here
```

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## Key Features

- Uses the new AI SDK v5 with `@ai-sdk/react` and `@ai-sdk/anthropic`
- Integrates with `@assistant-ui/react` using the new `useChatRuntime` hook
- No RSC support (client-side only)
- Simplified integration with the `useChatRuntime` hook that wraps AI SDK v5's `useChat`
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

The API route at `/api/chat` uses the new `streamText` function from AI SDK v5 to handle chat completions.

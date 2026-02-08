# @assistant-ui/react-cloudflare-agents

React integration for [Cloudflare Agents](https://developers.cloudflare.com/agents/) with [assistant-ui](https://www.assistant-ui.com/).

This package provides a reusable hook that connects Cloudflare Agents to assistant-ui's runtime system, enabling you to build full-featured chat UIs with real-time streaming, tool calling, and message management.

## Installation

```bash
npm install @assistant-ui/react-cloudflare-agents
```

Or with pnpm:

```bash
pnpm add @assistant-ui/react-cloudflare-agents
```

## Quick Start

### 1. Set up the backend (Cloudflare Worker)

Create your agent class in `worker/chat.ts`:

```typescript
import { AIChatAgent } from "@cloudflare/ai-chat";
import { createOpenAI } from "@ai-sdk/openai";
import {
  streamText,
  tool,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  zodSchema,
} from "ai";
import { z } from "zod";

export class Chat extends AIChatAgent<Env> {
  override async onChatMessage(onFinish, options) {
    const openai = createOpenAI({
      apiKey: this.env.OPENAI_API_KEY,
    });

    const tools = {
      get_weather: tool({
        description: "Get the current weather",
        inputSchema: zodSchema(
          z.object({
            location: z.string().describe("City name"),
          })
        ),
        execute: async ({ location }) => {
          return `Weather in ${location}: Sunny, 72°F`;
        },
      }),
    };

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = streamText({
          model: openai("gpt-4o-mini"),
          messages: await convertToModelMessages(this.messages),
          tools,
          onFinish,
        });
        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });
  }
}
```

### 2. Set up the frontend

Use the `useCloudflareAgentRuntime` hook in your React app:

```typescript
"use client";

import { useCloudflareAgentRuntime } from "@assistant-ui/react-cloudflare-agents";
import { AssistantRuntimeProvider, Thread } from "@assistant-ui/react";

export default function ChatPage() {
  const runtime = useCloudflareAgentRuntime("chat", {
    host: "http://localhost:8787",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-screen flex flex-col">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
```

## API Reference

### `useCloudflareAgentRuntime(agentName, options?)`

Hook that creates an assistant-ui runtime connected to a Cloudflare Agent.

#### Parameters

- **`agentName`** (string, required): The name of the agent to connect to (e.g., "chat")

- **`options`** (object, optional):
  - **`host`** (string, optional): Host URL for the Cloudflare Worker running the agent. Required when running the worker separately (e.g., with wrangler dev). Example: `"http://localhost:8787"`
  - **`adapters`** (ExternalStoreAdapter["adapters"], optional): Optional adapters for attachments, speech, feedback, etc.

#### Returns

An `AssistantRuntime` instance that can be used with `AssistantRuntimeProvider`.

#### Example

```typescript
// Local development
const runtime = useCloudflareAgentRuntime("chat", {
  host: "http://localhost:8787",
});

// Production (worker deployed to Cloudflare)
const runtime = useCloudflareAgentRuntime("chat", {
  host: "https://my-agent.example.workers.dev",
});
```

## Architecture

### How It Works

1. **Frontend Hook** (`useCloudflareAgentRuntime`):
   - Connects to Cloudflare agent via WebSocket (using `useAgent` from `agents/react`)
   - Retrieves chat interface via `useAgentChat` from `@cloudflare/ai-chat/react`
   - Converts UIMessage format to assistant-ui ThreadMessage format
   - Returns an AssistantRuntime for use with assistant-ui components

2. **Backend Agent** (`AIChatAgent`):
   - Receives user messages via WebSocket
   - Streams AI responses using Vercel AI SDK
   - Handles tool execution
   - Sends streamed responses back to client

3. **Message Flow**:
   ```
   User Input → Frontend Hook → WebSocket → Worker Agent → AI Model
   ↓                                         ↓
   AssistantRuntime ← ThreadMessages ← UIMessageStream
   ```

## Adding Tools

Tools allow the AI to perform actions. Add them in your agent's `onChatMessage` method:

```typescript
const tools = {
  calculator: tool({
    description: "Perform arithmetic calculations",
    inputSchema: zodSchema(
      z.object({
        expression: z.string().describe("Math expression (e.g., '2 + 2')"),
      })
    ),
    execute: async ({ expression }) => {
      try {
        const result = eval(expression);
        return `Result: ${result}`;
      } catch (error) {
        return `Error: ${error.message}`;
      }
    },
  }),
};
```

## Environment Variables

### Local Development (.dev.vars)

```
OPENAI_API_KEY=sk-your-key-here
```

### Production (Cloudflare Secrets)

```bash
npx wrangler secret put OPENAI_API_KEY
```

## Examples

### Custom Model Provider

Use a different AI model provider:

```typescript
import { createAnthropic } from "@ai-sdk/anthropic";

export class Chat extends AIChatAgent<Env> {
  override async onChatMessage(onFinish, options) {
    const anthropic = createAnthropic({
      apiKey: this.env.ANTHROPIC_API_KEY,
    });

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = streamText({
          model: anthropic("claude-3-5-sonnet-20241022"),
          messages: await convertToModelMessages(this.messages),
          tools,
          onFinish,
        });
        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });
  }
}
```

### System Prompt

Customize the AI's behavior with a system prompt:

```typescript
const result = streamText({
  model: openai("gpt-4o-mini"),
  system: `You are a helpful customer support agent.
    Your name is Alex. Keep responses concise and friendly.`,
  messages: await convertToModelMessages(this.messages),
  tools,
  onFinish,
});
```

## Styling & Customization

The hook provides raw runtime data. Pair it with assistant-ui components for UI:

```typescript
import {
  Thread,
  UserMessage,
  AssistantMessage,
  Composer,
} from "@assistant-ui/react";

export function CustomChat() {
  const runtime = useCloudflareAgentRuntime("chat", {
    host: "http://localhost:8787",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
      <Composer />
    </AssistantRuntimeProvider>
  );
}
```

For styling, see [assistant-ui components documentation](https://www.assistant-ui.com/docs/components/thread).

## Deployment

### Deploy to Cloudflare Workers

1. Update the host in your frontend to point to your deployed worker:
   ```typescript
   const runtime = useCloudflareAgentRuntime("chat", {
     host: "https://my-agent.example.workers.dev",
   });
   ```

2. Deploy the worker:
   ```bash
   npx wrangler deploy
   ```

3. Set the production API key:
   ```bash
   npx wrangler secret put OPENAI_API_KEY
   ```

## Related Resources

- [Assistant-UI Documentation](https://www.assistant-ui.com/docs)
- [Cloudflare Agents](https://developers.cloudflare.com/agents/)
- [Cloudflare AI Chat Package](https://www.npmjs.com/package/@cloudflare/ai-chat)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Example Application](https://github.com/assistant-ui/assistant-ui/tree/main/examples/with-cloudflare-agents)

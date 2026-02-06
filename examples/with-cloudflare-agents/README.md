# Cloudflare Agents Example

This example demonstrates how to use [assistant-ui](https://assistant-ui.com) with [Cloudflare Agents](https://developers.cloudflare.com/agents/).

## Features

- Real-time chat powered by Cloudflare Agents WebSocket
- Tool calling support (weather example included)
- Streaming responses
- Full assistant-ui component library

## Prerequisites

- Node.js >= 20
- pnpm
- OpenAI API key

## Setup

1. **Install dependencies** (from monorepo root):

   ```bash
   pnpm install
   ```

2. **Set up environment variables**:

   ```bash
   cp .dev.vars.example .dev.vars
   ```

   Edit `.dev.vars` and add your OpenAI API key:

   ```
   OPENAI_API_KEY=sk-...
   ```

3. **Build the packages** (from monorepo root):

   ```bash
   pnpm build
   ```

4. **Run the development servers** (requires 2 terminals):

   **Terminal 1 - Start the Cloudflare Worker:**
   ```bash
   cd examples/with-cloudflare-agents
   npx wrangler dev
   ```

   **Terminal 2 - Start the Next.js frontend:**
   ```bash
   cd examples/with-cloudflare-agents
   npx next dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
with-cloudflare-agents/
├── worker/
│   ├── index.ts             # Cloudflare Worker entry point
│   └── chat.ts              # AIChatAgent implementation
├── app/
│   ├── globals.css          # Tailwind styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main page with Thread component
├── lib/
│   └── utils.ts             # Utility functions
├── wrangler.jsonc           # Cloudflare Worker configuration
├── .dev.vars.example        # Environment variables template
└── package.json
```

## How It Works

### Architecture

This example runs two servers:
1. **Cloudflare Worker** (port 8787) - Runs the AIChatAgent with wrangler
2. **Next.js Frontend** (port 3000) - Connects to the worker via WebSocket

### Frontend

The frontend uses `useCloudflareAgentRuntime` from `@assistant-ui/react-cloudflare-agents`:

```tsx
import { useCloudflareAgentRuntime } from "@assistant-ui/react-cloudflare-agents";

const runtime = useCloudflareAgentRuntime("chat", {
  host: "http://localhost:8787",
});
```

This hook:
1. Connects to the Cloudflare agent via WebSocket
2. Converts messages to assistant-ui format
3. Provides a runtime for the `AssistantRuntimeProvider`

### Backend

The backend uses Cloudflare's `AIChatAgent` class:

```typescript
import { AIChatAgent } from "@cloudflare/ai-chat";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, createUIMessageStream, createUIMessageStreamResponse } from "ai";

export class Chat extends AIChatAgent<Env> {
  override async onChatMessage(onFinish, options) {
    // Create OpenAI provider with API key from environment
    const openai = createOpenAI({
      apiKey: this.env.OPENAI_API_KEY,
    });

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = streamText({
          model: openai("gpt-4o-mini"),
          messages: await convertToModelMessages(this.messages),
          tools: { /* ... */ },
          onFinish,
        });
        writer.merge(result.toUIMessageStream());
      },
    });
    return createUIMessageStreamResponse({ stream });
  }
}
```

**Important**: Note that we use `createOpenAI` instead of the default `openai` import, and pass the API key from `this.env.OPENAI_API_KEY`. This is because Cloudflare Workers pass environment variables via the `env` object, not `process.env`.

## Adding Tools

To add more tools, modify `worker/chat.ts`:

```typescript
import { tool, zodSchema } from "ai";
import { z } from "zod";

tools: {
  my_tool: tool({
    description: "Description of what the tool does",
    inputSchema: zodSchema(
      z.object({
        param1: z.string().describe("Parameter description"),
      }),
    ),
    execute: async ({ param1 }) => {
      // Tool implementation
      return "Result";
    },
  }),
},
```

## Deployment

To deploy to Cloudflare Workers:

1. Log in to Cloudflare:
   ```bash
   npx wrangler login
   ```

2. Set production secrets:
   ```bash
   npx wrangler secret put OPENAI_API_KEY
   ```

3. Deploy:
   ```bash
   npx wrangler deploy
   ```

4. Update your frontend to point to the deployed worker URL.

## Learn More

- [assistant-ui Documentation](https://www.assistant-ui.com/docs)
- [Cloudflare Agents Documentation](https://developers.cloudflare.com/agents/)
- [@cloudflare/ai-chat Package](https://www.npmjs.com/package/@cloudflare/ai-chat)

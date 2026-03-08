---
name: assistant-ui
description: Add, configure, and integrate assistant-ui components in React apps. Use when developers ask to add a chat thread, set up a runtime, integrate with AI SDK, configure tools, or build AI chat interfaces with assistant-ui.
---

# assistant-ui

Use this skill to help users build AI chat interfaces with assistant-ui.

## Step 1: Check Project Setup

Check if the project has `components.json` (shadcn config) and `@assistant-ui/react` installed.

If assistant-ui is not yet set up, run:

```bash
npx assistant-ui init --yes
```

This initializes shadcn and installs the default assistant-ui chat components.

## Step 2: Add Components

Install components via the shadcn registry:

```bash
npx shadcn@latest add "https://r.assistant-ui.com/chat/b/ai-sdk-quick-start/json"
```

Available component presets:

| Preset | Registry URL |
|--------|-------------|
| AI SDK Quick Start | `https://r.assistant-ui.com/chat/b/ai-sdk-quick-start/json` |

You can also add individual assistant-ui shadcn components:

```bash
npx shadcn@latest add assistant-ui/thread
npx shadcn@latest add assistant-ui/markdown-text
```

## Step 3: Runtime Setup

assistant-ui requires a runtime. The most common setup uses AI SDK:

### AI SDK Runtime (recommended)

Install the integration package:
```bash
npm install @assistant-ui/react-ai-sdk
```

Create a chat API route (Next.js App Router):

```ts
// app/api/chat/route.ts
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, config } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    ...config,
  });

  return result.toDataStreamResponse();
}
```

Create the assistant component:

```tsx
"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

export const Assistant = () => {
  const runtime = useChatRuntime({
    api: "/api/chat",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
};
```

## Step 4: Tools (optional)

To add tool calling support, define tools on the backend and render them on the frontend:

### Backend tool (AI SDK):

```ts
import { streamText, tool } from "ai";
import { z } from "zod";

const result = streamText({
  model: openai("gpt-4o"),
  messages,
  tools: {
    get_weather: tool({
      description: "Get weather for a location",
      parameters: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => {
        return { temperature: 72, condition: "sunny", location };
      },
    }),
  },
});
```

### Frontend tool UI:

```tsx
"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";

export const WeatherToolUI = makeAssistantToolUI({
  toolName: "get_weather",
  render: ({ args, result }) => {
    return (
      <div>
        <p>Weather for {args?.location}</p>
        {result && <p>{result.temperature}F, {result.condition}</p>}
      </div>
    );
  },
});
```

Register the tool UI in your assistant component:

```tsx
<AssistantRuntimeProvider runtime={runtime}>
  <WeatherToolUI />
  <Thread />
</AssistantRuntimeProvider>
```

## Key Packages

| Package | Purpose |
|---------|---------|
| `@assistant-ui/react` | Core React components and primitives |
| `@assistant-ui/react-ai-sdk` | Vercel AI SDK integration |
| `@assistant-ui/react-markdown` | Markdown rendering |
| `@assistant-ui/react-syntax-highlighter` | Code highlighting |
| `@assistant-ui/ui` | Pre-built shadcn/ui component set |
| `@assistant-ui/styles` | Pre-built CSS for non-Tailwind users |

## Environment Variables

For OpenAI-based setups, ensure `OPENAI_API_KEY` is set in `.env.local`.

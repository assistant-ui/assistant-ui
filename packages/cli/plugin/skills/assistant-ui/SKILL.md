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
npx shadcn@latest add "https://r.assistant-ui.com/base/chat/b/ai-sdk-quick-start/json"
```

For Radix-styled projects (`components.json` style not starting with `base-`), use `https://r.assistant-ui.com/chat/b/ai-sdk-quick-start/json` instead.

Available component presets:

| Preset | Registry URL |
|--------|-------------|
| AI SDK Quick Start | `https://r.assistant-ui.com/base/chat/b/ai-sdk-quick-start/json` |

You can also add individual assistant-ui components with the assistant-ui CLI, which picks the right flavor from `components.json`:

```bash
npx assistant-ui add thread
npx assistant-ui add markdown-text
```

To use the shadcn CLI directly instead, add the assistant-ui registry to `components.json`:

```json
{
  "registries": {
    "@assistant-ui": "https://r.assistant-ui.com/styles/{style}/{name}.json"
  }
}
```

Then add components with the namespaced form:

```bash
npx shadcn@latest add @assistant-ui/thread
npx shadcn@latest add @assistant-ui/markdown-text
```

## Step 3: Runtime Setup

assistant-ui requires a runtime. The most common setup uses AI SDK:

### AI SDK Runtime (recommended)

Install the integration package:
```bash
npm install @assistant-ui/ai-sdk
```

The `ai-sdk-quick-start` preset from Step 2 already installs both files below. Write them by hand only for a project that skipped the preset, and keep them identical to what the registry ships so later preset updates stay compatible.

The chat API route (Next.js App Router). `AssistantChatTransport` forwards the runtime's system message and frontend tools on every request, so the route reads them off the body and passes the frontend tools through `frontendTools`:

```ts
// app/api/chat/route.ts
import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/ai-sdk";
import {
  streamText,
  convertToModelMessages,
  type UIMessage,
  type JSONSchema7,
} from "ai";

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
  } = await req.json();

  const result = streamText({
    model: openai("gpt-5.6-luna"),
    messages: await convertToModelMessages(messages),
    tools: {
      ...frontendTools(tools ?? {}),
    },
    ...(system === undefined ? {} : { system }),
  });

  return result.toUIMessageStreamResponse();
}
```

The assistant component. `sendAutomaticallyWhen` continues the run once a frontend tool has produced its result:

```tsx
// app/assistant.tsx
"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";

export const Assistant = () => {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-dvh">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
};
```

## Step 4: Tools (optional)

To add tool calling support, define tools on the backend and render them on the frontend:

### Backend tool (AI SDK):

```ts
import { streamText, tool, zodSchema } from "ai";
import { z } from "zod";

const result = streamText({
  model: openai("gpt-5.6-luna"),
  messages: await convertToModelMessages(messages),
  tools: {
    ...frontendTools(tools ?? {}),
    get_weather: tool({
      description: "Get weather for a location",
      inputSchema: zodSchema(
        z.object({
          location: z.string(),
        }),
      ),
      execute: async ({ location }) => {
        return { temperature: 72, condition: "sunny", location };
      },
    }),
  },
});
```

### Frontend tool UI:

Create a toolkit with a renderer for the tool. The tool executes on the backend, so the entry uses `externalTool()` and only attaches UI:

```tsx
// app/toolkit.tsx
"use generative";

import { defineToolkit, externalTool } from "@assistant-ui/react";

export default defineToolkit({
  get_weather: {
    execute: externalTool(),
    render: ({ args, result }) => {
      return (
        <div>
          <p>Weather for {args?.location}</p>
          {result && <p>{result.temperature}F, {result.condition}</p>}
        </div>
      );
    },
  },
});
```

Register the toolkit in your assistant component:

```tsx
import { AssistantRuntimeProvider, Tools, useAui } from "@assistant-ui/react";
import toolkit from "@/app/toolkit";

const aui = useAui({
  tools: Tools({ toolkit }),
});

<AssistantRuntimeProvider aui={aui} runtime={runtime}>
  <Thread />
</AssistantRuntimeProvider>
```

Do not use `makeAssistantToolUI`, `useAssistantToolUI`, `makeAssistantTool`, or `useAssistantTool`; they are deprecated in favor of toolkits.

## Key Packages

| Package | Purpose |
|---------|---------|
| `@assistant-ui/react` | Core React components and primitives |
| `@assistant-ui/ai-sdk` | Vercel AI SDK integration |
| `@assistant-ui/react-markdown` | Markdown rendering |
| `@assistant-ui/react-syntax-highlighter` | Code highlighting |
| `@assistant-ui/ui` | Pre-built shadcn/ui component set |
| `@assistant-ui/styles` | Pre-built CSS for non-Tailwind users |

## Environment Variables

For OpenAI-based setups, ensure `OPENAI_API_KEY` is set in `.env.local`.

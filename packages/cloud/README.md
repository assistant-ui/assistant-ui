# `assistant-cloud`

[![npm version](https://img.shields.io/npm/v/assistant-cloud)](https://www.npmjs.com/package/assistant-cloud)
[![npm downloads](https://img.shields.io/npm/dm/assistant-cloud)](https://www.npmjs.com/package/assistant-cloud)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

Server- and client-side SDK for [Assistant Cloud](https://cloud.assistant-ui.com), the managed thread-history, telemetry, and file-storage backend for `@assistant-ui/react`.

## Installation

```bash
npm install @assistant-ui/react @assistant-ui/ai-sdk assistant-cloud
```

## Usage

Pass an `AssistantCloud` instance to your runtime hook (typically `useChatRuntime` from `@assistant-ui/ai-sdk`):

```tsx
import { AssistantCloud, AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";

const cloud = new AssistantCloud({
  baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
  anonymous: true,
});

export function Provider({ children }: { children: React.ReactNode }) {
  const runtime = useChatRuntime({ cloud });
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
```

## Server telemetry

Send AI SDK 7 GenAI spans to Assistant Cloud from a Next.js app. The AI SDK emits spans through `@ai-sdk/otel`, and the `assistant-cloud/telemetry` entry needs the OpenTelemetry packages installed next to it:

```sh
npm i @vercel/otel @ai-sdk/otel @opentelemetry/api @opentelemetry/sdk-trace-base @opentelemetry/exporter-trace-otlp-http
```

Register the span processor in `instrumentation.ts` so it starts once per server process:

```ts
import { registerOTel } from "@vercel/otel";
import {
  createAssistantCloudSpanProcessor,
  createAssistantCloudTraceExporter,
} from "assistant-cloud/telemetry";

export function register() {
  registerOTel({
    serviceName: "my-app",
    spanProcessors: [
      "auto",
      createAssistantCloudSpanProcessor(
        createAssistantCloudTraceExporter({
          apiKey: process.env.ASSISTANT_API_KEY!,
        }),
      ),
    ],
  });
}
```

In the route that calls `streamText`, enable the OpenTelemetry integration and pass the active trace ID to the browser with `messageMetadata`:

```ts
import { OpenTelemetry } from "@ai-sdk/otel";
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText } from "ai";
import { withAssistantCloudTraceMetadata } from "assistant-cloud/telemetry";

export async function POST(request: Request) {
  const { messages } = await request.json();
  const result = streamText({
    model: openai("gpt-5.6-luna"),
    messages: await convertToModelMessages(messages),
    telemetry: { integrations: [new OpenTelemetry()] },
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: withAssistantCloudTraceMetadata(),
  });
}
```

[Traces](https://www.assistant-ui.com/docs/cloud/traces) covers the exporter options, the span filter, and how Assistant Cloud merges a trace with the browser's run report.

## Authentication

| Mode             | Required fields                                         | Use case                              |
| ---------------- | ------------------------------------------------------- | ------------------------------------- |
| Anonymous        | `baseUrl`, `anonymous: true`                            | Demos and unauthenticated playgrounds.|
| JWT              | `baseUrl`, `authToken: () => Promise<string \| null>`   | Browser apps with their own auth.     |
| API key (server) | `apiKey`, `userId`, `workspaceId`                       | Server-side admin and data-plane jobs.|

For advanced persistence adapters and MCP sampling instrumentation, see the [docs](https://www.assistant-ui.com/docs/cloud).

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

## Building an integration

The pieces every client integration needs live in the package, so a runtime binding only maps its own events onto them.

- `CloudRunReporter` sends run reports: nothing while telemetry is off, the cloud's environment, release and tags on every report, the `beforeReport` hook applied last, and a failed send that never surfaces. A report given a key is sent once per key.
- `CloudEngagementReporter` derives engagement events (`message_sent`, `run_stopped`, `error_shown`, `suggestions_shown` and the rest) from what a chat integration observes and keeps the per thread state they need, such as a run's start for the stop duration. An id resolver turns the integration's own thread and message ids into the ids the cloud stores.
- `assistant-cloud/ai-sdk` holds the AI SDK specifics: `aiSDKV6FormatAdapter`, the stored form of a `UIMessage`, and `extractAISDKRunTelemetry`, which reads the run report fields out of one run's assistant messages. The entry needs `ai` installed next to it.

```ts
import { AssistantCloud, CloudRunReporter } from "assistant-cloud";
import { extractAISDKRunTelemetry } from "assistant-cloud/ai-sdk";

const cloud = new AssistantCloud({ baseUrl, anonymous: true });
const reporter = new CloudRunReporter(cloud);

const run = extractAISDKRunTelemetry(messages);
if (run) {
  await reporter.report(
    { threadId, ...run },
    `${threadId}:${run.assistantMessageId}`,
  );
}
```

## Server telemetry

Send AI SDK 7 GenAI spans to Assistant Cloud from a Next.js `instrumentation.ts` file. The `assistant-cloud/telemetry` entry needs the OpenTelemetry packages installed next to it:

```sh
npm i @vercel/otel @opentelemetry/api @opentelemetry/sdk-trace-base @opentelemetry/exporter-trace-otlp-http
```

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

Pass the active server trace ID to the browser with `messageMetadata` in the route that calls `streamText`:

```ts
import { withAssistantCloudTraceMetadata } from "assistant-cloud/telemetry";

return result.toUIMessageStreamResponse({
  messageMetadata: withAssistantCloudTraceMetadata(),
});
```

## Authentication

| Mode             | Required fields                                         | Use case                              |
| ---------------- | ------------------------------------------------------- | ------------------------------------- |
| Anonymous        | `baseUrl`, `anonymous: true`                            | Demos and unauthenticated playgrounds.|
| JWT              | `baseUrl`, `authToken: () => Promise<string \| null>`   | Browser apps with their own auth.     |
| API key (server) | `apiKey`, `userId`, `workspaceId`                       | Server-side admin and data-plane jobs.|

For advanced persistence adapters and MCP sampling instrumentation, see the [docs](https://www.assistant-ui.com/docs/cloud).

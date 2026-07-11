# `assistant-stream`

[![npm version](https://img.shields.io/npm/v/assistant-stream)](https://www.npmjs.com/package/assistant-stream)
[![npm downloads](https://img.shields.io/npm/dm/assistant-stream)](https://www.npmjs.com/package/assistant-stream)
[![bundle size](https://img.shields.io/bundlephobia/minzip/assistant-stream)](https://bundlephobia.com/package/assistant-stream)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

Framework-agnostic streaming primitives for AI assistant backends. Defines a chunked stream of typed events (text, tool calls, tool results, data parts, message metadata), encoders/decoders for several wire formats, and a server-side tool execution pipeline. Runs in any standard JavaScript runtime; no React or DOM dependencies.

Most apps reach `assistant-stream` indirectly through `@assistant-ui/react-ai-sdk` or `@assistant-ui/react-data-stream`, which handle the wire format for you. Install it directly when you are building a custom backend or a new integration package.

## Installation

```bash
npm install assistant-stream
```

## Usage

```typescript
import { createAssistantStreamResponse } from "assistant-stream";

export async function POST(request: Request) {
  return createAssistantStreamResponse(async (controller) => {
    controller.appendText("Hello, ");
    controller.appendText("world!");
  });
}
```

`createAssistantStreamResponse` returns a standard Web `Response`, so it works out of the box with any Fetch-style route (Next.js App Router, Hono, Bun.serve, Deno, Cloudflare Workers). Frameworks that use their own response objects (Express, Fastify) need a small adapter: copy `status` and `headers`, then pipe `response.body` into the framework's writable stream. Avoid sending the `Response` body into a `res` object whose lifecycle is already controlled by the framework (that is the `ERR_INVALID_STATE: Controller is already closed` failure mode).

`createAssistantStreamResponse` emits the data stream wire format and sets the
`x-vercel-ai-data-stream: v1` response header. On the frontend,
`useDataStreamRuntime({ api })` detects that marker automatically; pass
`protocol: "data-stream"` only if a custom proxy strips or hides the header.

For tool execution, pipe through `ToolExecutionStream`; for resumable streams (clients can reconnect and replay), import from the `assistant-stream/resumable` sub-path with a `redis` or `ioredis` adapter.

## Sub-paths

`.`, `./utils`, `./resumable`, `./resumable/redis`, `./resumable/ioredis`. The two Redis adapters are optional peer dependencies; install whichever client your stack already uses.

Full reference for encoders, tool execution, message conversion, and resumable streams at [assistant-ui.com/docs/architecture](https://www.assistant-ui.com/docs/architecture).

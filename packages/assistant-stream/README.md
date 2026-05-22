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
    const text = controller.appendText();
    text.append("Hello, ");
    text.append("world!");
    text.close();
  });
}
```

For tool execution, pipe through `ToolExecutionStream`; for resumable streams (clients can reconnect and replay), import from the `assistant-stream/resumable` sub-path with a `redis` or `ioredis` adapter.

## Sub-paths

`.`, `./utils`, `./resumable`, `./resumable/redis`, `./resumable/ioredis`. The two Redis adapters are optional peer dependencies; install whichever client your stack already uses.

Full reference for encoders, tool execution, message conversion, and resumable streams at [assistant-ui.com/docs/architecture](https://www.assistant-ui.com/docs/architecture).

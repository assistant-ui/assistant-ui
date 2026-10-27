# `assistant-stream`

[![npm version](https://img.shields.io/npm/v/assistant-stream)](https://www.npmjs.com/package/assistant-stream)
[![npm downloads](https://img.shields.io/npm/dm/assistant-stream)](https://www.npmjs.com/package/assistant-stream)
[![bundle size](https://img.shields.io/bundlephobia/minzip/assistant-stream)](https://bundlephobia.com/package/assistant-stream)
[![GitHub stars](https://img.shields.io/github/stars/assistant-ui/assistant-ui)](https://github.com/assistant-ui/assistant-ui)

Framework-agnostic streaming primitives for AI assistant backends. Defines a chunked stream of typed events (text, tool calls, tool results, data parts, message metadata), encoders/decoders for several wire formats, and a server-side tool execution pipeline. Runs in any standard JavaScript runtime; no React or DOM dependencies.

Most apps reach `assistant-stream` indirectly through `@assistant-ui/ai-sdk` or `@assistant-ui/react-data-stream`, which handle the wire format for you. Install it directly when you are building a custom backend or a new integration package.

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

## Streamfold parsing

Install `streamfold@^0.1.11` alongside `assistant-stream` to opt into its Rust/WASM
parser. Initialize it once before starting streams in each browser or server
bundle that should use it:

```ts
import { initializeStreamfold } from "assistant-stream/streamfold";

const enabled = await initializeStreamfold();
```

This enables Streamfold for subsequent shared tool-argument parsers in this
`assistant-stream` instance, including the message accumulator, active tool
argument readers, and React LangGraph. Existing parsers keep their backend.
`enabled` is false if WASM preparation or finalization support is unavailable;
the JavaScript parser remains usable. Import this optional entry only in
bundles where you intend to enable Streamfold.

The integration preserves partial values and metadata, security filtering,
mutable published snapshots, and independent parser branches. Unsupported or
malformed inputs and branches from an earlier parser fall back to native
parsing. Complete inputs initialized in one call keep the native JSON fast
path. Completed and rejected WASM parsers are disposed immediately; abandoned
partial parsers are released through Streamfold's finalizer after collection.

Streamfold is opt-in because performance depends on payload shape and chunk size;
small chunks can be slower than the default incremental JavaScript parser.
Measure representative payloads and chunk sizes in your runtime before enabling
it. This entry adds Streamfold's WASM download and initialization cost only to bundles that import it.

## Sub-paths

`.`, `./utils`, `./ai-sdk`, `./internal`, `./streamfold`, `./resumable`, `./resumable/redis`, `./resumable/ioredis`. `./ai-sdk` exports `frontendTools`, which converts the tool schemas an assistant-ui client uploads into AI SDK tools; it works with `ai@6` or `ai@7`, install it alongside (declared as an optional peer). `./internal` is an internal-use entry: it is published like every other export, but it only carries the helpers `@assistant-ui/ai-sdk` shares with `./ai-sdk` and is not a supported surface. The two Redis adapters are optional peer dependencies; install whichever client your stack already uses.

Full reference for encoders, tool execution, message conversion, and resumable streams at [assistant-ui.com/docs/architecture](https://www.assistant-ui.com/docs/architecture).

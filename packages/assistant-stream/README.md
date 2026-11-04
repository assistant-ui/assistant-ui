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

## JSON parser backends

`registerJsonParserBackend` lets integration packages provide an optional backend
for shared tool-argument parsing. The JavaScript parser remains the default;
assistant-stream has no dependency on a particular backend.

```ts
import { registerJsonParserBackend } from "assistant-stream";

const unregister = registerJsonParserBackend(({ text, fallback, createSnapshot }) => {
  return createCustomParser({ text, fallback, createSnapshot });
});

```

Keep `unregister` for application cleanup when the backend is no longer needed.

`createCustomParser` is supplied by the integration. Its returned backend exposes
`currentArgs` and `append(delta)`, which returns the next backend or `undefined`.
The host retains accepted text and its length for native replay. Each backend must
preserve its arguments for historical reads and independent branches. `createSnapshot(value,
state, partialPath)` detaches mutable containers and attaches assistant-stream's
partial-field metadata. Call it during backend creation or `append`, so errors
can trigger native fallback. Getters must return the retained snapshot without
calling `createSnapshot` lazily. Preserve the caller's fallback object until parsing
starts. Backends must match the native parser's values, metadata, and security
filtering; return `undefined` for unsupported input. Creation and append failures
fall back to native parsing using the accepted text and latest arguments.

Registration is shared across copies of assistant-stream in the same JavaScript
realm through a versioned global symbol. The latest registration is used for new
parsers. Its unregister function removes only that registration and can be called
repeatedly. Removing the latest registration restores the previous active one;
removing an older registration leaves the latest one active. Existing parsers
retain their backend. Register at application startup, not per request in a shared
server process. Complete inputs retain the native fast path.

This affects the shared parser used by message accumulators, active tool readers,
and runtimes built on it. Provider SDK parsers remain separate. The AI SDK
UI-message decoder currently buffers tool input until it is available, so that
path does not gain incremental parsing from a backend.

### Using Streamfold

Install `streamfold@^0.1.17` in your application, then initialize its integration
once at startup before creating streams:

```ts
import { initializeAssistantStream } from "streamfold/assistant-ui";

const enabled = await initializeAssistantStream();
```

`enabled` is `true` when the backend is registered. It is `false` if the installed
assistant-stream does not expose `registerJsonParserBackend`, or if WASM or
finalization support is unavailable. Native parsing remains available in those
cases. Importing the integration alone does not enable it, and assistant-stream
does not install Streamfold for you. Measure your workload before enabling it;
small deltas can be slower than native parsing.

## Sub-paths

`.`, `./utils`, `./ai-sdk`, `./internal`, `./resumable`, `./resumable/redis`, `./resumable/ioredis`. `./ai-sdk` exports `frontendTools`, which converts the tool schemas an assistant-ui client uploads into AI SDK tools; it works with `ai@6` or `ai@7`, install it alongside (declared as an optional peer). `./internal` is an internal-use entry: it is published like every other export, but it only carries the helpers `@assistant-ui/ai-sdk` shares with `./ai-sdk` and is not a supported surface. The two Redis adapters are optional peer dependencies; install whichever client your stack already uses.

Full reference for encoders, tool execution, message conversion, and resumable streams at [assistant-ui.com/docs/architecture](https://www.assistant-ui.com/docs/architecture).

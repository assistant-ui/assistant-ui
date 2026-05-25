---
"assistant-stream": patch
---

docs(assistant-stream): fix README usage example and clarify wire-format pairing

the README Usage snippet was calling `controller.appendText()` with no arguments and treating the return value as a writer, but `AssistantStreamController.appendText` has signature `(textDelta: string): void`. copy-pasting the old snippet threw `TypeError: Cannot read properties of undefined (reading 'append')` at the first `text.append(...)` call. switched the example to the actual API.

also added a short note that `createAssistantStreamResponse` returns a standard Web `Response` (drops into Next.js / Hono / Bun / Deno / Cloudflare Workers; Express and Fastify need a small adapter), and that the emitted bytes are the data stream wire format. on the frontend pair it with `useDataStreamRuntime({ api, protocol: "data-stream" })`; the default `protocol: "ui-message-stream"` expects AI SDK v6's SSE-based UI message stream format and will throw `Stream ended abruptly without receiving [DONE] marker` against this output.

---
"assistant-stream": patch
---

fix(assistant-stream): harden SSE and data-stream decoders against prototype pollution

The `SSEDecoder` and `DataStreamChunkDecoder` decoded untrusted wire input with bare `JSON.parse`, so a frame carrying `__proto__` or `constructor.prototype` keys decoded the pollution key as an own property. Both now parse with `secure-json-parse` (already used by the assistant-transport and UIMessage stream decoders), while preserving the existing throw-on-malformed-JSON error semantics.

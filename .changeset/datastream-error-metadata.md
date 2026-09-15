---
"assistant-stream": patch
---

fix(assistant-stream): preserve error `code` and `severity` on the data stream wire.

`DataStreamEncoder` previously serialized the `error` chunk's value as a plain string, dropping the optional `code` and `severity` fields declared on `AssistantStreamChunk`. The full-JSON SSE transport encoder preserved both, so the two encoders disagreed about what an error could carry. The data stream now emits an `{ error, code?, severity? }` object on `3:`, and the decoder round-trips it back to the upstream chunk. Legacy `3:"<string>"` frames still decode to `{ type: "error", error: "<string>" }`, so older clients stay interoperable.

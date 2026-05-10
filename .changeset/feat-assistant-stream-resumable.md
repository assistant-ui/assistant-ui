---
"assistant-stream": patch
---

feat(assistant-stream): add resumable stream primitives

new `assistant-stream/resumable` entrypoint for persisting an in-flight `AssistantStream` and replaying it after a disconnect or reload.

`createResumableStreamContext({ store, ttlMs?, waitUntil?, onAcquire?, onAppend?, onFinalize?, onError? })` returns `{ run, resume, requireResume, status, delete }`.

`createResumableAssistantStreamResponse` and `createResumeAssistantStreamResponse` bridge `AssistantStreamController` callbacks to any `AssistantStreamEncoder`.

`createInMemoryResumableStreamStore` covers dev and tests; Redis adapters live at `assistant-stream/resumable/redis` and `assistant-stream/resumable/ioredis` (peer deps), with pipelined appends and binary chunk values.

typed errors via `ResumableStreamError` with codes `"missing" | "exists" | "finalized" | "invalid-id"`.

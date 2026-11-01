---
"@assistant-ui/core": patch
"assistant-stream": patch
---

An approved AI SDK tool call now shows the result the server streams after the approval. `UIMessageStreamDecoder` passes on a `tool-output-available` or `tool-output-error` for a call an earlier response opened, and a `LocalRuntime` resume that yields a tool call the message holds without a result fills in that call instead of appending a second one.

When a continuation replaces a preliminary result, its model-facing content is replaced too, so later turns use the final result instead of stale progress text.

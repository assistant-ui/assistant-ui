---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"assistant-stream": patch
---

feat: add multi-agent support

- `ReadonlyThreadProvider` and `MessagePartPrimitive.Messages` for rendering sub-agent messages
- `assistant-stream`: add `messages` field to `tool-result` chunks, `ToolResponseLike`, and `ToolCallPart` types, enabling sub-agent messages to flow through the streaming protocol

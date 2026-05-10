---
"@assistant-ui/react-ai-sdk": patch
---

fix(react-ai-sdk): preserve tool args when AI SDK briefly emits null input

the AI SDK occasionally emits snapshots of an in-flight tool call where
`input` is null/undefined, which previously collapsed `argsText` to `"{}"`
mid-stream and tripped the runtime's append-only invariant (warning + tool
args stream restart, losing accumulated state). `convertMessage` now caches
the last good input per `(message.id, toolCallId)` via a new
`toolLastInputCache` on `AISDKMessageConverterMetadata` and falls back to it
when a later snapshot drops `input`.

---
"assistant-stream": patch
"@assistant-ui/react-data-stream": patch
---

`UIMessageStreamDecoder` decodes the AI SDK's tool approval chunks: a `tool-approval-request` puts `approval` on its tool call, keeping the server's fields (`signature` among them) verbatim, and an automatic denial settles the call. The accumulator also counts the first step of a UI message stream once instead of twice, so a run that needs a second roundtrip (a frontend tool result or an approval decision) is no longer stopped by `maxSteps`. `useCloudRuntime` sends a denied call without the error result `LocalRuntime` records for it, so a server using the AI SDK's tool approval answers it with an execution-denied result.

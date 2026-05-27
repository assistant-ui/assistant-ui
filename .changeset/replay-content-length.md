---
"@assistant-ui/react": patch
---

feat(assistant-transport): honour `Aui-Replay-Content-Length` to suppress side-effects during sync-server replay

`useAssistantTransportRuntime` now reads the `Aui-Replay-Content-Length` response header on resume and reports `isLoading: true` to the embedded tool-invocations tracker while the consumed body byte count is within the replay window. Tool calls in the replayed portion of the stream are recorded as historical and skip `streamCall` / `execute`, so reconnecting to a buffered run no longer re-fires frontend side effects. Live bytes after the boundary fire normally. Responses without the header behave as today.

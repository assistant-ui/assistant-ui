---
"@assistant-ui/react": patch
---

feat(assistant-transport): honour `Aui-Replay-Content-Length` to split sync-server replay from live bytes

`useAssistantTransportRuntime` now reads the `Aui-Replay-Content-Length` response header on resume and gates the body at that byte boundary. The replay prefix is decoded while `isLoading: true` has rendered through React, then the reader pauses until `isLoading: false` has rendered before releasing live bytes. Tool calls in the replayed portion are recorded as historical and skip `streamCall` / `execute`, while tool calls that begin after the replay boundary fire normally. Responses without the header behave as today.

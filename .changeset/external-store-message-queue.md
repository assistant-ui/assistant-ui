---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-langgraph": patch
---

feat: message queuing for external-store, langgraph, and local runtimes

the composer can now stay usable while a run is in progress: a message sent during a run is held in `composer.queue` (rendered via `ComposerPrimitive.Queue` / `QueueItemPrimitive.*`) and processed once the run settles. external-store adapters opt in by providing a `queue` adapter (typically built with the new `createMessageQueue` helper); `useLangGraphRuntime` and `useLocalRuntime` opt in via `unstable_enableMessageQueue`. `ExternalThreadQueueAdapter` now lives in `@assistant-ui/core` (still re-exported from `@assistant-ui/react`).

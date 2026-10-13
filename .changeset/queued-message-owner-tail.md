---
"@assistant-ui/core": patch
---

fix(core): a queued external store message is dispatched under the thread tail and metadata of the runtime that queued it when several runtimes share one message queue

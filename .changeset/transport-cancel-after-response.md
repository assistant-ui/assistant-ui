---
"@assistant-ui/core": patch
---

fix(core): cancelling an assistant transport run after its response body was fully received calls `onCancel` and clears the queued commands, instead of leaving them pending and sending them with the next run

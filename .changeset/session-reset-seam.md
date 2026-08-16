---
"@assistant-ui/core": patch
"@assistant-ui/eve": patch
---

feat: add `unstable_notifySessionReset` so adapters with a resettable backing session can clear session-scoped tool-invocation state without run-cancel side effects; the eve reset now uses it instead of composing `cancelRun` with a hand-rolled session filter

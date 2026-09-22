---
"@assistant-ui/core": patch
---

fix(core): log a failed `ThreadRuntime.append` instead of rethrowing into a floating promise, which surfaced every failed send as an unhandled rejection

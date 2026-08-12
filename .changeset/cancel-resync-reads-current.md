---
"@assistant-ui/core": patch
---

fix: reconcile cancelRun's deferred resync with store updates that land before it flushes, instead of stamping a pre-cancel snapshot over them

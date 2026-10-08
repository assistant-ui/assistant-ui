---
"@assistant-ui/core": patch
---

fix: switch away from the main thread when an archive or delete aimed at its listed duplicate lands on it once `initialize()` merges the two, instead of leaving the runtime on a deleted or archived thread

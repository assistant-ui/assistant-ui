---
"@assistant-ui/core": patch
---

fix: start the main thread's runtime when a switch or `initialize()` selects a thread that was detached while it was in flight, instead of leaving the main thread with no runtime

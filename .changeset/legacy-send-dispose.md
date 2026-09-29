---
"@assistant-ui/core": patch
---

fix: a thread its thread list discards for good now abandons an attachment send it was still preparing, instead of dispatching it after the thread is gone.

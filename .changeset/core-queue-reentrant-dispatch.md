---
"@assistant-ui/core": patch
---

fix: reserve a queued run before notifying subscribers so reentrant enqueues preserve FIFO order.

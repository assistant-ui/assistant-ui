---
"@assistant-ui/eve": patch
---

fix: serialize eve sends so approvals and sends during an active turn no longer crash or drop messages. Unmounting the runtime drops sends still queued behind the active turn.

---
"@assistant-ui/eve": patch
---

fix: serialize eve sends so approvals and sends during an active turn no longer crash or drop messages. Cancelling a run or unmounting the runtime drops sends still queued behind the active turn.

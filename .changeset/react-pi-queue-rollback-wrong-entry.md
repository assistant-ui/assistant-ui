---
"@assistant-ui/react-pi": patch
---

fix(react-pi): don't let a failed send remove the wrong queued message

Queue the same text twice; if the first request fails after the second succeeds, the first send's rollback removed the successful message from the local queue. A failed optimistic send now rolls back only while its own optimistic entry is still exactly what's shown — once a `queue_update`, a reconnect/refresh snapshot, or a clear has reconciled the queue, the entry is left to Pi's authoritative state instead of being matched by content and deleted.

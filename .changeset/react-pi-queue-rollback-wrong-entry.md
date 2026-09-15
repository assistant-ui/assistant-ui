---
"@assistant-ui/react-pi": patch
---

fix(react-pi): don't let a failed send remove the wrong queued message

Queue the same text twice; if the first request fails after the second succeeds, the first send's rollback removed the successful message from the local queue. `sendQueued` rolled back by `entries.lastIndexOf(input.content)`, which can't tell two identical entries apart, and it read the queue as it stood at failure time — after a server `queue_update` had already reconciled the pair down to the one genuinely-queued message. The rollback now runs only while no `queue_update` has reconciled the queue since the entry was enqueued; once the server is authoritative, the optimistic entry is already resolved and is left alone.

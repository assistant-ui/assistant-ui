---
"assistant-cloud": patch
---

run leases live on the thread: `threads.runs.open` opens the thread's lease before the reply exists (the newest run wins, ending the thread's other running lease), and the holder's first write with `lease_id` stores the reply and binds the lease to it. Message lists carry the thread's running lease as `run` (`null` when none, absent from servers before v0.2.11). `CloudMessagePersistence.beginRun` opens a run without storing a row, so a run that dies before its first write leaves no message; `threadRunOf` reads the thread's run from the latest load. Against servers before v0.2.11, `beginRun` resolves false and the first running write opens a lease on the row as before.

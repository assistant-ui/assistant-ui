---
"assistant-cloud": patch
---

run leases live on the thread: `threads.runs.open` opens the thread's lease before the reply exists (the newest run wins, ending the thread's other running lease), and the holder's first write with `lease_id` stores the reply and binds the lease to it. Message lists carry the thread's running lease as `run` (`null` when none). `CloudMessagePersistence.beginRun` opens a run without storing a row, so a run that dies before its first write leaves no message; `threadRunOf` reads the thread's run from the latest load. A message appended as running opens the thread lease too. Servers before v0.2.11 are not supported: `beginRun` rejects with an error that says so.

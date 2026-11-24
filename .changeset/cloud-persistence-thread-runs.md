---
"assistant-cloud": patch
---

`CloudMessagePersistence` keeps run leases on the thread. A message appended as running opens the thread's lease with `threads.runs.open`, then stores itself as the lease holder, instead of creating the row with `open_run`. The new `beginRun` opens the lease without storing a row, and the reply's first write stores it, so a run that dies before writing leaves no message. The newest run wins: a run whose lease a newer one ended stops writing. Needs Assistant Cloud v0.2.12 or newer; against an older server, opening the run rejects with an error that names the version.

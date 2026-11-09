---
"assistant-cloud": patch
---

add run leases to thread messages: `threads.runs` opens (`open`), keeps alive (`heartbeat`) and ends (`end`, with an optional reason) a run, `open_run` on message create opens one with the message, `lease_id` on create and update writes as its holder, and listed messages carry their `run` state; `CloudMessagePersistence` opens a run for a message appended as running, heartbeats on the server's interval, ends it after the final write, and follows a `superseded` conflict to the sibling message the server stored the write on

---
"assistant-cloud": patch
---

add run leases to thread messages: `open_run` on message create opens a lease that belongs to that message, `threads.runs` keeps it alive (`heartbeat`) and ends it (`end`, with an optional reason), `lease_id` on create and update writes as its holder, and listed messages carry their `run` state; `CloudMessagePersistence` opens a run for a message appended as running, heartbeats on the server's interval, ends it after the final write, keeps heartbeating while the page is in the background, and stops writing a message whose lease went stale, ended or was refused; `createFormattedPersistence` passes a run phase through on append and update, so run leases work for any message format

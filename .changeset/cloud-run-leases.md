---
"assistant-cloud": patch
---

add run leases to thread messages: `open_run` on message create opens a lease that belongs to that message, `threads.runs` keeps it alive (`heartbeat`) and ends it (`end`, with an optional reason, `interrupted` among them), `lease_id` on create and update writes as its holder, and listed messages carry their `run` state; `CloudMessagePersistence` opens a run for a message appended as running, heartbeats on the server's interval, ends it after the final write, ends the runs it holds as `interrupted` with a keepalive request when the page unloads (a page kept in the back/forward cache keeps its runs and heartbeats again when shown), drops a plain write refused with `run_in_progress` because another session runs the message, and stops writing a message whose lease went stale, ended or was refused; `createFormattedPersistence` passes a run phase through on append and update, so run leases work for any message format

---
"assistant-cloud": patch
---

add run leases to thread messages: `open_run` on message create opens a lease that belongs to that message and runs until its holder ends it, `threads.runs` records heartbeats (`heartbeat`) and ends a run (`end`, with an optional `done`, `cancelled` or `error` reason), `lease_id` on create and update writes as its holder, and listed messages carry their `run` (`running` or `ended`, with the server-measured `last_heartbeat_ms_ago`); `CloudMessagePersistence` opens a run for a message appended as running, heartbeats on the server's interval (also while the page is in the background), ends it after the final write, stops writing a message whose lease was ended elsewhere or refused, and reads a listed run with `runStateOf` as in progress or, after `staleAfter` (default 30 seconds) without a heartbeat, stale; `createFormattedPersistence` passes a run phase through on append and update, so run leases work for any message format

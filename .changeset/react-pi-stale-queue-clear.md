---
"@assistant-ui/react-pi": patch
---

fix(react-pi): don't let a stale queue-clear response hide newer messages

Clearing the queue and then queueing another message could leave the UI empty while the message stayed queued on the server. A slow clear response no longer empties a queue that a newer message repopulated while the clear was in flight.

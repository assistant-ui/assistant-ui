---
"assistant-cloud": patch
---

add run leases to thread messages: `run` on message create and update, `messages.heartbeat()`, and the `run` state on listed messages; `CloudMessagePersistence` opens a lease for a message appended as running, heartbeats on the server's interval, closes it with the settled write, and follows a fork to a sibling message

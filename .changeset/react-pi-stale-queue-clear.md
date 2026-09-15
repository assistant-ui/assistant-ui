---
"@assistant-ui/react-pi": patch
---

fix(react-pi): don't let a stale queue-clear response hide newer messages

Clearing the queue and then queueing another message could leave the UI empty while the message stayed queued on the server. `PiThreadController.clearQueue` emptied the local mirror after its request resolved, reading the queue fresh at that point — so a slow clear response wiped a queue that a later `sendQueued` or server `queue_update` had already repopulated. It now snapshots the queue reference before awaiting and only empties when nothing newer landed in the meantime (both queue mutations allocate a fresh queue object, so reference equality is a reliable check).

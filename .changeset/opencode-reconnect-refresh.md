---
"@assistant-ui/react-opencode": patch
---

fix(react-opencode): re-sync thread history, session status, and pending permissions/questions after the event stream reconnects, so events lost while disconnected (e.g. `session.idle` or `permission.asked`) cannot leave `isRunning` stuck or deadlock a run

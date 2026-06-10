---
"@assistant-ui/react-opencode": patch
---

fix(react-opencode): re-sync thread history and session status after the event stream reconnects, so events lost while disconnected (e.g. `session.idle`) cannot leave `isRunning` stuck

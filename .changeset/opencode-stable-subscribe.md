---
"@assistant-ui/react-opencode": patch
---

fix(react-opencode): stop re-subscribing to the OpenCode event stream on every render, which could drop `session.idle` and leave `isRunning` stuck at `true`

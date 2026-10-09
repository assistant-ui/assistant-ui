---
"@assistant-ui/core": patch
---

fix(core): an external store runtime recomputes its messages when client tools stop running, so no reply stays marked running after `unstable_notifySessionReset` or a conversation swap during a tool call

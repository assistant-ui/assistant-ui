---
"@assistant-ui/core": patch
---

fix(core): a queued external store send is dispatched after its own thread's last message when another runtime shares the queue, as React StrictMode's second runtime instance does in development

---
"@assistant-ui/eve": patch
---

fix: restage a user message whose queued send is cancelled instead of dropping it. Hitting Stop while a message is queued behind the active turn now leaves that message visible in the thread as a staged draft that can be reloaded; cancelled tool approvals are still discarded.

---
"@assistant-ui/eve": patch
---

fix: restage a user message whose queued send is cancelled instead of dropping it. Hitting Stop while a message is queued behind the active turn now leaves that message visible in the thread as a staged draft that a reload promotes, superseding the 0.0.10 note that cancelling a run drops queued sends. Cancelled tool approvals are still discarded, and unmounting the runtime still drops whatever is queued.

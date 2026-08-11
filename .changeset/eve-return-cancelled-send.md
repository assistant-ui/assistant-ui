---
"@assistant-ui/eve": patch
---

fix: hand a cancelled queued send back to the composer instead of dropping it. hitting Stop while a message waits behind the active turn now restores that message as the composer draft, superseding the 0.0.10 note that cancelling a run drops queued sends. cancelled tool approvals are still discarded, and unmounting the runtime still drops whatever is queued.

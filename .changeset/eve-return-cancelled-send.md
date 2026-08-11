---
"@assistant-ui/eve": patch
---

fix: hand a cancelled queued send back to the composer instead of dropping it. hitting Stop while a message waits behind a streaming turn now restores that message as the composer draft, superseding the 0.0.10 note that cancelling a run drops queued sends. a turn cancelled before it streamed still hands its own message back to the composer first, so the queued one is dropped in that window. cancelled tool approvals are still discarded, and unmounting the runtime still drops whatever is queued.

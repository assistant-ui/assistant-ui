---
"@assistant-ui/tap": patch
---

fix(tap): a `flushTapSync` runs only the tasks and notifications queued in its own flush, so an update dispatched before a `flushTapSync` to a root its callback does not update is no longer flushed by it and commits on the next scheduled flush; a `mountOnSubscribe` root subscribed from a listener no longer fails on another root's listener error, and a same-tick unsubscribe and resubscribe no longer remounts a lazy root when another root mounts in between

---
"@assistant-ui/tap": patch
---

fix(tap): keep a `mountOnSubscribe` root mounted through a same-tick unsubscribe and resubscribe when another root mounts in between; `flushTapSync` no longer runs tasks queued before it was called

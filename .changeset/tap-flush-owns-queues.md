---
"@assistant-ui/tap": patch
---

fix(tap): a `flushTapSync` runs only the tasks and notifications queued in its own flush, so a `mountOnSubscribe` root subscribed from a listener no longer fails on another root's listener error, and a same-tick unsubscribe and resubscribe no longer remounts a lazy root when another root mounts in between

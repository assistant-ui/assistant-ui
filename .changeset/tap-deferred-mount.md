---
"@assistant-ui/tap": patch
---

feat: add `mountOnSubscribe` option to createTapRoot for a subscriber-derived lifecycle — eager render, effects commit on first subscribe, soft unmount (cleanups run, state preserved) when the last subscriber leaves, and remount on the next subscribe

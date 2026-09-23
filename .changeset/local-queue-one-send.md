---
"@assistant-ui/core": patch
---

fix(core): keep the local message queue to one send at a time when a regenerate, a cancel or a follow-up run overlaps a queued send, and stop a queued send that is cancelled before its run starts

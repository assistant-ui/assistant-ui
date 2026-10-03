---
"@assistant-ui/core": patch
---

fix(core): keep the local message queue to one send at a time when a regenerate, a cancel or a follow-up run overlaps a queued send or the queue is turned on during a run, and keep it sending after a cancel while a queued send waits to start

---
"@assistant-ui/tap": patch
---

The update-depth error now throws from the markDirty that schedules the run past the limit, so the stack points at the offending setState.

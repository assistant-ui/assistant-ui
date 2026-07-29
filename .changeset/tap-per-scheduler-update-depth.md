---
"@assistant-ui/tap": patch
---

UpdateScheduler: count update depth per scheduler and drop only the offending scheduler from a flush, so one looping root no longer starves or wedges unrelated roots

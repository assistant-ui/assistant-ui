---
"@assistant-ui/tap": patch
---

fix: count update depth per scheduler in UpdateScheduler and drop only the offending scheduler from a flush, so one looping root no longer starves or wedges unrelated roots

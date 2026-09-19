---
"@assistant-ui/core": patch
---

fix: exit replay mode when reading a replay stream fails, so `isReplaying` no longer stays stuck after a failed resume

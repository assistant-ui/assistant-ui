---
"@assistant-ui/core": patch
---

fix: a history adapter without `update` now stores a paused run once a later turn cancels it, and importing a thread accepts a message listed before its parent, so a turn sent after a pause reloads instead of failing with `Parent message not found`

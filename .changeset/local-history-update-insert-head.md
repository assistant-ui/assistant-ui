---
"@assistant-ui/core": patch
---

The local storage history adapter now moves the thread head when `update` inserts a message it did not have, as `append` does.

---
"@assistant-ui/core": patch
---

fix: key each rendered suggestion by its content instead of its array index, so removing or reordering a suggestion no longer displays a removed suggestion's component state against a surviving one

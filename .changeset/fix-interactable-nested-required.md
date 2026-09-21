---
"@assistant-ui/core": patch
---

fix(core): keep nested required fields in interactable update tool schemas, so the model sends a nested object whole instead of a partial one that the shallow merge would store as is

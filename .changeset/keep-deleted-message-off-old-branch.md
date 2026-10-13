---
"@assistant-ui/core": patch
---

fix(core): a message deleted through an external store's `onDelete` while an earlier reply regenerates stays deleted when the old reply's branch is restored

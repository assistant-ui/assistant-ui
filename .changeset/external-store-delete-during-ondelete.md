---
"@assistant-ui/core": patch
---

fix(core): a message deleted through an external store's `onDelete` stays deleted when the host re-renders or the thread reloads before `onDelete` resolves, instead of coming back as a branch

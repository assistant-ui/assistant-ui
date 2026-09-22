---
"@assistant-ui/core": patch
---

fix(core): persist a tool result added after its message settled through the history adapter's `update`, and report a cloud run only from the write that first settles its message

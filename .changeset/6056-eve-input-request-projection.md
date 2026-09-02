---
"@assistant-ui/eve": patch
---

feat: project eve's input request onto the approval itself

`prompt`, `display`, and `allowFreeform` now land on `approval` rather than only on `providerMetadata.eve.inputRequest`, and a response's first-class `text` is submitted as eve's free-form answer ahead of the `reason` it used to be smuggled in.

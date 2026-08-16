---
"@assistant-ui/store": patch
---

feat: `aui.optional.<scope>` resolves an unavailable scope to `undefined` instead of a throwing accessor, mirroring `s.optional` on the state side; the documented availability check moves off `source != null`

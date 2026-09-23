---
"@assistant-ui/core": patch
---

fix: isolate composer state when switching in-memory threads; an external-store core adopting a shared repository mid-run now reuses its live optimistic placeholder

---
"@assistant-ui/core": patch
---

fix: give each in-memory thread its own composer, and abandon a deleted thread's pending attachment send instead of dispatching it through that thread; an external-store core adopting a shared repository mid-run now reuses its live optimistic placeholder

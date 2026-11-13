---
"@assistant-ui/x-buildutils": patch
---

Emit ESM package declarations with the native TypeScript 7 compiler, which about halves a cold build of every package. The emitted types are equivalent, though some unions, members and inferred types print differently.

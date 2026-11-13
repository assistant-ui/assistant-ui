---
"@assistant-ui/x-buildutils": patch
---

Emit the declarations of ESM packages with the native TypeScript 7 compiler. In local measurements this about halved a cold build of every package in the repository. The emitted types are equivalent, though some unions, members and inferred types print differently.

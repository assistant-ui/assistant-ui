---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

refactor: hoist `MessagePartPrimitiveInProgress` to `@assistant-ui/core/react` so `@assistant-ui/react`, `@assistant-ui/react-ink`, and other distributions can share the same implementation. `@assistant-ui/react`'s `MessagePartPrimitive.InProgress` is unchanged for callers; it now re-exports from core.

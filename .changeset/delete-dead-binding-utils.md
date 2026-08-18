---
"@assistant-ui/react": patch
---

chore: delete the dead `ensureBinding` and `useRuntimeState` utilities

`src/context/react/utils/ensureBinding.ts` and
`src/context/react/utils/useRuntimeState.ts` imported only each other. Nothing
else in the repo referenced them, neither appears in the package barrel or the
api-surface snapshot, and the `"."`-only exports map made them unreachable to
consumers. `ensureBinding` was an external caller of `__internal_bindMethods`
that no longer had a caller of its own; the runtime classes bind themselves in
their constructors, so nothing changes at runtime. The public API surface is
unchanged and every other emitted file is byte-identical.

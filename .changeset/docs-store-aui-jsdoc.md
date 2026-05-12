---
"@assistant-ui/store": patch
---

docs: add JSDoc for `useAui`, `useAuiState`, `useAuiEvent`, `AuiIf`, and `AuiProvider`

documents the modern core entry points used by application code: usage notes for the no-args `useAui()` shape, the runtime-throw caveat on `useAuiState` selectors, the dotted event-name selector form on `useAuiEvent`, the conditional-render contract on `AuiIf`, and the missing-provider behavior on `AuiProvider`. examples are taken from real call sites in the monorepo.

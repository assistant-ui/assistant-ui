---
"@assistant-ui/generative-ui": patch
"@assistant-ui/react-generative-ui": patch
---

feat: export `resolveFieldReferences` and `hasFieldReference`, so a custom component that dispatches its own `$action` can resolve `{ "$field": name }` references against its own values. `resolveFieldReferences` now keeps a reference nested deeper than 64 levels as is, matching `hasFieldReference`.

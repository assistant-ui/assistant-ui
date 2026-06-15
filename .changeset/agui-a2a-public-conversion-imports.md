---
"@assistant-ui/react-ag-ui": patch
"@assistant-ui/react-a2a": patch
---

chore: import `generateId` and `fromThreadMessageLike` from the public `@assistant-ui/core` entry instead of `/internal`

no behavior change; these utilities are now part of the public API.

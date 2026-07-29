---
"@assistant-ui/store": patch
---

useAui: memoize scope meta via shallow equality on the query object instead of a spread deps array, so query key-count changes are detected reliably

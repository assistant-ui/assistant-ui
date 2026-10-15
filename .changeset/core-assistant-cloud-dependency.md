---
"@assistant-ui/core": patch
---

`assistant-cloud` is a dependency of `@assistant-ui/core` instead of an optional peer, so `@assistant-ui/core/react` loads in Node and Vitest without installing it separately.

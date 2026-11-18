---
"@assistant-ui/react-ag-ui": patch
---

Declare `@assistant-ui/tap` and `zod` as required peer dependencies. `@assistant-ui/core` and `@assistant-ui/store` require `@assistant-ui/tap`, and `@ag-ui/client` requires `zod`, so strict installs such as Yarn Plug'n'Play resolve them without `packageExtensions`.

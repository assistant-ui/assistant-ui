---
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

fix: depend on `assistant-cloud` like `@assistant-ui/react` does, so an app whose runtime is not the AI SDK one can bundle; `@assistant-ui/core` imports it from its react entry and optional peers are not installed

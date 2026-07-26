---
"@assistant-ui/tap": patch
"@assistant-ui/store": patch
---

refactor: `ResourceElement<Result>` drops its args type parameter — elements are opaque descriptors; `Resource<Result, Args>` keeps the callable typing and `ContravariantResource` is removed

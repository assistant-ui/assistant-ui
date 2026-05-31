---
"@assistant-ui/x-generative-compiler": patch
"@assistant-ui/next": patch
---

feat: extract the framework-agnostic `"use generative"` compiler into the internal `@assistant-ui/x-generative-compiler` package. `@assistant-ui/next` now consumes the shared compiler instead of bundling its own copy, so other build integrations can reuse it.

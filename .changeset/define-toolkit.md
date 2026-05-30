---
"assistant-stream": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: add `defineToolkit()` and the `ToolkitDeclaration` type — author a toolkit permissively (backend tools may declare `description`/`parameters`/`execute`); the result is typed as the canonical `Toolkit`. Pairs with the `"use generative"` compiler, which erases the wrapper per build.

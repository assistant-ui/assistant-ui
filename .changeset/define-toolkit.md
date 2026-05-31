---
"assistant-stream": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: add the `ToolkitDeclaration` / `ToolkitDeclarationDefinition` types for authoring a toolkit permissively (a backend tool may declare `description`/`parameters`/`execute`); the canonical `Toolkit` keeps those fields erased. Author with `defineToolkit()` from `@assistant-ui/react`, which the `"use generative"` compiler strips per build.

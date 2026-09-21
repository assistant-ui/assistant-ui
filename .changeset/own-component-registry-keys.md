---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

fix: resolve component registries by own keys only, so a component, tool or data part name that only `Object.prototype` has (`toString`, `constructor`, `__proto__`) takes the `Fallback` or `GenerativeUIRenderError` path instead of rendering the inherited built-in

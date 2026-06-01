---
"@assistant-ui/next": patch
"@assistant-ui/react-langgraph": patch
---

fix: resolve type-check errors — `@assistant-ui/next` now extends the Node tsconfig so `node:path` resolves, and drop an unused import in `react-langgraph`

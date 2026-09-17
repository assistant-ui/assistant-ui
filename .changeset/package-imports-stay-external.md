---
"@assistant-ui/x-buildutils": patch
"assistant-stream": patch
"@assistant-ui/react-generative-ui": patch
---

fix: keep package imports external in `aui-build` output without resolving them, and fail the build when anything from `node_modules` would be bundled. `assistant-stream` and `@assistant-ui/react-generative-ui` now depend on `@types/json-schema` instead of shipping a copy of it under `dist/node_modules`.

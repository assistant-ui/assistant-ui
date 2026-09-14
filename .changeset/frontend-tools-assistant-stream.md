---
"assistant-stream": patch
"@assistant-ui/ai-sdk": patch
---

feat: add `assistant-stream/ai-sdk` with `frontendTools`

`frontendTools` and its model-content helpers now live in `assistant-stream`, so a backend that only converts uploaded tool schemas can import them from `assistant-stream/ai-sdk` with just `assistant-stream` and `ai` installed. `ai` is an optional peer of `assistant-stream` on `^6.0.0 || ^7.0.0`; `frontendTools` emits the tagged `file` tool-result part on `ai@7` and the `file-data` part on `ai@6`. `@assistant-ui/ai-sdk` keeps exporting `frontendTools` and `FrontendTools` unchanged.

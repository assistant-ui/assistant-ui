---
"assistant-stream": patch
"@assistant-ui/ai-sdk": patch
---

feat: add `assistant-stream/ai-sdk` with `frontendTools`

`frontendTools` and its model-content helpers now live in `assistant-stream`, so a backend that only converts uploaded tool schemas can import them from `assistant-stream/ai-sdk` with just `assistant-stream` and `ai` installed. `@assistant-ui/ai-sdk` keeps exporting `frontendTools` and `FrontendTools` unchanged.

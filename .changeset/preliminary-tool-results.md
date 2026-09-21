---
"@assistant-ui/core": patch
"@assistant-ui/react-pi": patch
"@assistant-ui/ai-sdk": patch
---

feat: mark interim tool output as `isPreliminary` so a tool that streams its result stays running until the final result lands, instead of reading as complete on the first chunk; react-pi flags live `partialResult` output and ai-sdk flags `preliminary` outputs, and the default tool fallback keeps the output a cancelled tool streamed before it was cut off

---
"@assistant-ui/core": patch
"@assistant-ui/react-google-adk": patch
---

fix: keep a tool call's pending approval or interrupt actionable when the call already carries a result, so a question raised by a tool that streamed output first (react-pi partial results) still renders its controls instead of reading as complete

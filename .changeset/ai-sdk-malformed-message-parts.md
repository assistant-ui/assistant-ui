---
"@assistant-ui/ai-sdk": patch
---

fix: a UIMessage with a null or untyped part, a system message with several text parts or none, a file part without a url, or a text or dynamic-tool part missing its text or toolName no longer crashes the thread, stops messages from sending, or renders undefined values

---
"assistant-stream": patch
---

fix(assistant-stream): emit `step-finish`, `message-finish` and error chunks after the part chunks written before them, so the data stream keeps a tool call's args

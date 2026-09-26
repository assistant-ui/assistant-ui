---
"assistant-stream": patch
---

fix: a tool call's streamed args now reach the stream before its result, so `addToolCallPart({ args, response })` keeps its args over the data stream instead of arriving as `{}`

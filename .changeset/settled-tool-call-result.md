---
"assistant-stream": patch
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

fix: keep a settled tool call distinguishable from an unfinished one, so a tool returning false, 0, "" or null no longer loses its result on the cloud round trip and no longer reads as never completed

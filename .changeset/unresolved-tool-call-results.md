---
"assistant-stream": patch
---

fix: synthesize a result for tool calls that have none, so a thread holding a cancelled or abandoned tool call no longer breaks every later run

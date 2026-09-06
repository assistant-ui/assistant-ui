---
"assistant-stream": patch
---

fix: complete aborted in-memory stream reads without throwing a stored error after the last buffered chunk.

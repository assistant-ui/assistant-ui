---
"assistant-stream": patch
---

fix: DataStreamChunkDecoder skips blank framing lines and drops colon-less lines with a warning instead of throwing

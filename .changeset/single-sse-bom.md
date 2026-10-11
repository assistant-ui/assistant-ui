---
"assistant-stream": patch
---

consume only one leading UTF-8 BOM when decoding SSE streams, so a second BOM does not turn an unknown field into event data.

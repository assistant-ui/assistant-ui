---
"assistant-stream": patch
---

Stop scanning SSE input at the done marker so an oversized suffix in the same chunk cannot reject an otherwise complete stream. Preserve line and event limits before the marker.

---
"assistant-stream": patch
---

fix: validate per-type required fields at the assistant-transport decode boundary and drop malformed chunks in the accumulator instead of aborting the response; an unsupported part-start now inserts an empty reasoning placeholder to keep later part indices aligned

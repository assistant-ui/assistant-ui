---
"assistant-stream": patch
---

fix: cancel merged assistant streams when a transform is cancelled or errors, including child streams waiting for their next chunk.

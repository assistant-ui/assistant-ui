---
"assistant-stream": patch
---

preserve error `code` and `severity` on the data stream wire. an error that sets either now emits a `3:{"error",...}` object frame that clients older than this release cannot read, so upgrade clients before servers that set them; an error without metadata stays a bare `3:"message"` string, and the decoder reads both shapes.

---
"assistant-stream": patch
---

fix: avoid applying initial object stream operations twice

The first decoded chunk now represents its authoritative snapshot as a
synthetic root `set`; later chunks preserve their incremental operations.

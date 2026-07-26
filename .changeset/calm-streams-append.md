---
"assistant-stream": patch
---

fix: avoid applying initial gorp stream operations twice

The first decoded chunk now represents its authoritative snapshot as a
synthetic root `set`; later chunks preserve their incremental operations.
The deprecated object stream aliases share the same encoder and fix.

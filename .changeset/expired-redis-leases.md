---
"assistant-stream": patch
---

fix: release Redis producer lease bookkeeping when finalization finds an expired or superseded stream, preserving newer leases and legacy ownership fences.

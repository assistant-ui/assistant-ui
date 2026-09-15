---
"assistant-stream": patch
---

fix: a producer whose stream expired no longer writes into or finalizes the stream a later `run` starts under the same id. `createResumableStreamContext` now passes a lease from the new optional `ResumableStreamStore.acquireLease` to `append` and `finalize`; the bundled in-memory and Redis stores implement it, and custom stores opt in by implementing it.

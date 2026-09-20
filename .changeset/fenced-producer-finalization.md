---
"assistant-stream": patch
---

fix: `createResumableStreamContext` no longer reports `onFinalize` for a producer whose finalize was fenced out by a newer acquisition of the same stream. `ResumableStreamStore.finalize` now resolves `false` when it finalized nothing (the bundled in-memory and Redis stores return it; a custom store that resolves without a value is still taken to have finalized), the context skips the hook on `false`, and a producer whose `"done"` finalize lost the stream is reported through `onError` with the same superseded `ResumableStreamError` its append would have thrown.

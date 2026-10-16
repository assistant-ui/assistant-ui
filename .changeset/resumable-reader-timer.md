---
"assistant-stream": patch
---

fix: prevent idle resumable stream readers from repeatedly waking and emitting timer overflow warnings when retention exceeds the platform timer limit.

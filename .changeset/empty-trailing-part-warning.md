---
"assistant-stream": patch
---

feat: warn in dev mode when a text or reasoning part is appended while the preceding part is still streaming, so the last-part-wins part-status derivation no longer silently completes the earlier part without a signal

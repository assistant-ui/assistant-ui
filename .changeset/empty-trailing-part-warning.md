---
"assistant-stream": patch
---

feat: warn in dev mode at stream end when a text or reasoning part never received a part-finish before a later part was appended, so the last-part-wins status derivation no longer silently completes it without a signal

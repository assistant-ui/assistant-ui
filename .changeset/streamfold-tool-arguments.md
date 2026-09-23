---
"assistant-stream": patch
---

Retain incremental parser state while tool argument readers are active, preserving
lazy parsing, partial field metadata, and legacy validation for unsupported input.

---
"assistant-stream": patch
---

Use Streamfold only while a long JSON string is still arriving. Keep small and complete arguments on the existing parser, release the incremental parser between long strings, and preserve tool rendering and partial-field metadata.

Scan incoming deltas directly so checking string boundaries does not repeatedly flatten the accumulated argument text.

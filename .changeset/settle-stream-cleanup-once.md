---
"@assistant-ui/core": patch
---

fix: finalize cancelled iterators once, skip finalizing naturally exhausted sources, and release abort listeners when stream opening or reads settle.

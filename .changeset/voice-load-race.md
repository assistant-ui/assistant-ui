---
"@assistant-ui/core": patch
---

fix: hold a voice transcript or typed turn until a pending thread history load settles, so it is committed onto the loaded thread instead of a branch the import leaves behind

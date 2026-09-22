---
"@assistant-ui/tap": patch
---

fix: bail out of a no-op state dispatch from an effect under a React host instead of re-rendering on every commit

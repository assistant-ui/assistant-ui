---
"@assistant-ui/core": patch
---

fix: preserve falsy error payloads such as `0`, `""` and `false` in external runtimes, while continuing to treat `null` as no error

---
"@assistant-ui/core": patch
---

fix(core): keep a send made from a queue or thread subscriber behind the queued send that is starting, instead of running both at once

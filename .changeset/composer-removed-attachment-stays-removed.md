---
"@assistant-ui/core": patch
---

fix(core): when a send fails, keep an attachment removed while its message was being sent out of the composer, and keep one whose removal failed in the composer with the reason

---
"@assistant-ui/core": patch
---

fix(core): call `adapter.remove` once for a composer attachment whose removal is still pending. Removing it again does nothing, and `reset()` and `clearAttachments()` skip it. If that removal then fails, only the `removeAttachment()` caller sees the rejection

---
"@assistant-ui/core": patch
---

fix(core): keep a file whose removal failed while it was still uploading in the composer when the send fails. A file in the message being sent is removed at most once while its removal is pending: removing it again does nothing, and `reset()` skips it. If that removal then fails, only the `removeAttachment()` caller sees the rejection. A removal that has already failed is still retried

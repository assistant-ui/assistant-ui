---
"@assistant-ui/core": patch
---

fix(core): edit composer no longer re-injects original file parts when user message attachments are modified. Non-text content parts on user messages are lifted into `_attachments` so attachment removals take effect and files aren't duplicated on resend; non-user messages keep the existing content pass-through.

---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: support external source attachments in composer

`addAttachment()` now accepts either a `File` or a `CreateAttachment` descriptor, allowing users to add attachments from external sources (URLs, API data, CMS references) without creating dummy `File` objects or requiring an `AttachmentAdapter`.

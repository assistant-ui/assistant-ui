---
"@assistant-ui/core": patch
---

fix(core): respect `adapter.accept` when adding external `CreateAttachment`

`composer.addAttachment` previously bypassed the configured `AttachmentAdapter` for `CreateAttachment` descriptors, including the `adapter.accept` content-type check. It now validates the descriptor's `contentType` (or filename extension) against `adapter.accept` when an adapter is configured, throwing and emitting `composer.attachmentAddError` on mismatch. Without an adapter, external attachments are still added as-is, preserving the existing "no adapter required" guarantee for external sources.

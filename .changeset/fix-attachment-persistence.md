---
"@assistant-ui/react": patch
---

fix(cloud): add encoding support for image/file/audio/data message parts in auiV0Encode

Previously, `auiV0Encode()` threw an error for image, file, audio, and data message part types instead of serializing them. This caused file attachments uploaded via `CloudFileAttachmentAdapter` to be lost on page reload.

The decoder (`fromThreadMessageLike`) already handled these types, so only the encoder needed modification.

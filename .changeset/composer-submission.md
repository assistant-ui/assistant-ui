---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

feat: show a message with uploading attachments in the thread while it is being sent

`MessagePrimitive.Attachments` now hands its render function `Attachment` rather than `CompleteAttachment`, because the row of a message that is still being sent shows attachments that are still uploading. a render function that reads `attachment.content` should check `attachment.status.type === "complete"` first.

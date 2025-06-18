---
"@assistant-ui/react": patch
---

Add CloudFileAttachmentAdapter with promise-based uploads and progress bar support

- Add CloudFileAttachmentAdapter that uploads files to AssistantCloud
- Implement promise-based upload pattern: upload starts in add(), awaited in send()
- Add real-time progress updates using XMLHttpRequest upload progress events
- Extend PendingAttachment type with optional uploadPromise field
- Add AttachmentProgress component to shadcn registry template
- Show progress bar at bottom of file attachments during upload

---
"@assistant-ui/core": patch
"@assistant-ui/ai-sdk": patch
"@assistant-ui/react-opencode": patch
---

fix: stop an attachment send when the thread it belongs to is destroyed

an `ExternalThread` composer now aborts the send it is preparing when the client that owns the thread is destroyed, and never hands it to `onNew` or `onEdit` afterwards, whether or not the adapter honors the abort. hiding the thread, for example inside `<Activity>`, still lets the send finish and deliver the message. `SimpleImageAttachmentAdapter`, `SimpleTextAttachmentAdapter`, the AI SDK attachment adapter and `OpenCodeAttachmentAdapter` stop reading the file once the send's signal aborts.

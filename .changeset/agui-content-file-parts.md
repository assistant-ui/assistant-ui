---
"@assistant-ui/react-ag-ui": patch
---

fix: convert file parts placed directly in message content

`buildUserContent` filtered every `file` part out of `message.content`, on the stated grounds that binary always flows through `message.attachments`. That rule was not actually implemented: `image` and `audio` content parts, equally binary, were converted from content all along, so only `file` was excluded. It also guarded nothing, because both composer paths put binary in attachments and leave content as text (the edit composer lifts non-text parts with `liftNonTextParts` and passes none through), and because content-sourced and attachment-sourced parts land in the same flat `InputContent[]` with no downstream distinction. The only way a file part reached that filter was a deliberate `append()`, where it was silently dropped.

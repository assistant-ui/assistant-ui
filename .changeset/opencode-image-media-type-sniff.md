---
"@assistant-ui/react-opencode": patch
---

fix: read an image's media type from its leading bytes

The image media type ladder ran the attachment's `contentType`, then a data URL envelope, then `image/png`, so a bare base64 JPEG, GIF or WebP was announced as png. It now sniffs the payload's leading bytes before falling to the floor, using `detectMediaType` from `@ai-sdk/provider-utils`, which is the same detector that runs on the other side of OpenCode's own conversion into AI SDK parts. A payload carrying a generic envelope such as `application/octet-stream` is sniffed too, since the bytes rather than the envelope are read.

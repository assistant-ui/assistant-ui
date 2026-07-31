---
"@assistant-ui/core": patch
"@assistant-ui/react-ai-sdk": patch
"@assistant-ui/react-opencode": patch
---

fix: read an image's media type from its leading bytes in both adapters

`detectImageMediaType` and `dataUrlMediaType` join `parseDataUrl` and `isParsableUrl` in `@assistant-ui/core/internal`. An `ImageMessagePart` carries no media type, so an adapter that must declare one on the wire now reads it from the payload rather than assuming a format. It never throws, whatever a caller put on the part.

react-ai-sdk and react-opencode run the same ladder rung for rung: the attachment's `contentType`, then a data URL's declared type when that is itself an image type (read whether or not the payload is base64, so an SVG data URL keeps its type), then the leading bytes, then `image/png`. Previously react-opencode had no byte rung at all, and react-ai-sdk's was skipped for any `data:` payload, so a JPEG inside a generic `application/octet-stream` envelope resolved to png on both.

Resolving the label alone was not enough, because a data URL's own media type wins over the declared one downstream. Both adapters now rebuild the envelope when it disagrees with the resolved type and forward it untouched when it agrees. That applies to file parts too, where a `mimeType: "application/pdf"` part carrying an `application/octet-stream` envelope was announced as pdf and delivered as octet-stream. File parts also gain the same three rungs, so an empty `mimeType` falls to the envelope and then to `application/octet-stream` rather than producing a malformed `data:;base64,` url; `vercelAttachmentAdapter` emits exactly that shape for a file the OS cannot type.

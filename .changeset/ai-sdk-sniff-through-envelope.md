---
"@assistant-ui/react-ai-sdk": patch
---

fix: read an image's bytes through a data URL envelope, and re-envelope a disagreeing payload

The byte sniff added in #5466 was guarded by `!isParsableUrl(...)`, which is true for a `data:` URL, so a payload carrying a generic envelope such as `data:application/octet-stream;base64,<jpeg bytes>` skipped the sniff and resolved to `image/png`. The decoded bytes are now read in that case too.

Resolving the label alone was not enough: a data URL's own media type wins over `mediaType` downstream, so the envelope is rebuilt whenever it disagrees with the resolved type, and forwarded untouched when it agrees. This applies to file parts as well, where a `mimeType: "application/pdf"` part carrying an `application/octet-stream` envelope was announced as pdf and delivered as octet-stream.

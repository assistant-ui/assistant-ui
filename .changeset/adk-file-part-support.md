---
"@assistant-ui/react-google-adk": patch
---

fix(react-google-adk): preserve file attachment data on the wire

`useAdkRuntime.getMessageContent` previously collapsed file message parts into a `[File: <name>]` text marker before sending to ADK, dropping the base64 payload entirely. new `file` and `file_url` variants on `AdkMessageContentPart` carry the binary through `AdkClient` and `useAdkMessages.contentToParts`, which serialize them as `inlineData` and `fileData` on the wire. inbound, `AdkEventAccumulator` sniffs MIME type so non-image `inlineData` produces a `file` part (rather than being silently coerced into `image`), and explicitly non-image `fileData` produces `file_url`; `fileData` with no MIME type falls back to `image_url` to preserve the legacy round-trip. `convertAdkMessage` maps `file` to a core `FileMessagePart` and `file_url` to a `data` part named `"file_url"`.

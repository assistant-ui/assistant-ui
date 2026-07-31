---
"@assistant-ui/react-opencode": patch
---

fix: send image parts as file parts so they reach the model

`getPromptParts` emitted `{ type: "image", image }`, a part type OpenCode does not define: its input union is text, file, agent and subtask, and upstream's converter has no image branch, so an `ImageMessagePart` never reached the model. Images now go out as `FilePartInput`, with the media type read from the attachment's `contentType`, then a data URL envelope, then `image/png` as the floor, matching the ladder react-ai-sdk uses for the same input. An inline payload is re-enveloped with the resolved media type rather than forwarded, because the AI SDK lets a data URL's own type win over the declared one; the same now applies to file parts, whose declared `mimeType` was previously overridden by a mismatched envelope, and an empty `mimeType` floors to `application/octet-stream` rather than producing a malformed `data:;base64,` url.

The attachment's own `name` and `contentType` now ride onto its flattened parts instead of being dropped, so an image attachment keeps its filename and its real media type. Both the outbound prompt and the pending optimistic copy share one flatten, so their reconciliation fingerprints agree; previously a named image attachment produced a pending `contentText` of the raw base64 payload.

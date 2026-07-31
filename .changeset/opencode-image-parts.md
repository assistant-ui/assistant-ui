---
"@assistant-ui/react-opencode": patch
---

fix: send image parts as file parts so they reach the model

`getPromptParts` emitted `{ type: "image", image }`, a part type OpenCode does not define: its input union is text, file, agent and subtask, and upstream's converter has no image branch, so an `ImageMessagePart` never reached the model. Images now go out as `FilePartInput`, with the media type read from the attachment's `contentType`, then a data URL envelope, then `image/png` as the floor, matching the ladder react-ai-sdk uses for the same input. The payload gets the same url treatment as file parts, wrapped when it is not already a parsable url.

The attachment's own `name` and `contentType` now ride onto its flattened parts instead of being dropped, so an image attachment keeps its filename and its real media type. Both the outbound prompt and the pending optimistic copy share one flatten, so their reconciliation fingerprints agree; previously a named image attachment produced a pending `contentText` of the raw base64 payload.

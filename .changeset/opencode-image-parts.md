---
"@assistant-ui/react-opencode": patch
---

fix: send image parts as file parts so they reach the model

`getPromptParts` emitted `{ type: "image", image }`, a part type OpenCode does not define: its input union is text, file, agent and subtask, and upstream's converter has no image branch, so an `ImageMessagePart` never reached the model. Images now go out as `FilePartInput`, with the media type read from a data URL envelope when there is one and `image/*` otherwise, since the part carries no media type of its own. The payload gets the same url treatment as file parts, wrapped when it is not already a parsable url.

The attachment's own `name` and `contentType` now ride onto its flattened parts instead of being dropped, so an image attachment keeps its filename and its real media type.

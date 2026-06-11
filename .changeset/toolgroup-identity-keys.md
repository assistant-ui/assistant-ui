---
"@assistant-ui/core": patch
---

fix: stable identity for grouped message parts across reorders

tool groups (and chain-of-thought groups) in `MessagePrimitive.Parts` and group nodes in `MessagePrimitive.GroupedParts` are now keyed by the id of their first part (`toolCallId`) instead of their positional index, and tool parts inside a group are keyed by their own id. when a message's parts array re-orders between live streaming and the settled shape, group and part React identity now survives the re-slice, so collapse/open state no longer resets. groups whose first part has no id keep their structural key, and duplicate ids fall back to structural keys, so keys stay unique.

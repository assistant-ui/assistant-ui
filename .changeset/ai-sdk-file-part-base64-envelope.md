---
"@assistant-ui/react-ai-sdk": patch
---

fix(react-ai-sdk): wrap bare base64 file parts in a data URL envelope

`toCreateMessage` forwarded a file part's `data` straight into the AI SDK `url` field, so a part carrying bare base64 (no `data:` envelope, not http) shipped an invalid `url` the AI SDK cannot hand to a provider. The file branch now wraps bare base64 in `data:${mimeType};base64,` and re-uses the typed `mimeType` for already-envelope'd data URLs, matching the audio branch.
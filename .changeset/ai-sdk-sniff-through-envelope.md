---
"@assistant-ui/react-ai-sdk": patch
---

fix: sniff an image's bytes through a data URL envelope

The byte sniff added in #5466 was guarded by `!isParsableUrl(...)`, which is true for a `data:` URL, so a payload carrying a generic envelope such as `data:application/octet-stream;base64,<jpeg bytes>` skipped the sniff and resolved to `image/png`. The decoded bytes are now read in that case too, matching react-opencode.

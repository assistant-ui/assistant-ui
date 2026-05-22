---
"@assistant-ui/core": patch
---

relax `thread-message-like` image validation to accept `https://` and `blob:` URLs (and `svg+xml` data URIs) alongside base64 `data:` URIs, so assistant-authored images served from a URL render.

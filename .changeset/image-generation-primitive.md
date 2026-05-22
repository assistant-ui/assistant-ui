---
"@assistant-ui/core": patch
"@assistant-ui/ui": patch
---

relax `thread-message-like` image validation to accept `https://` and `blob:` URLs (and `svg+xml` data URIs) alongside base64 `data:` URIs, so assistant-generated images served from a URL render. extend the `@assistant-ui/ui` `Image` component with loading, content-filter, zoom, and action (download / copy / regenerate) states.

---
"assistant-ui": patch
---

Increase the `create` command download timeout from 30 s to 120 s and support an `ASSISTANT_UI_DOWNLOAD_TIMEOUT` environment variable (ms) for further tuning. Cold-cache runs on slower connections were failing because the full monorepo tarball (~58 MB) could not complete within the previous limit. When a pinned release ref is known, `preferOffline: true` is now forwarded to giget so a cached tarball is reused on repeat cold runs. The timeout error message is updated to describe the actual cause.

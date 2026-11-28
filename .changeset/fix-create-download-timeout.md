---
"assistant-ui": patch
---

Increase the download timeout for `create` and `agent` from 30 seconds to 120 seconds so downloads can finish on slow connections. Set `ASSISTANT_UI_DOWNLOAD_TIMEOUT_MS` to override the timeout in milliseconds. Both commands show this setting when a download times out.

---
"@assistant-ui/react-ag-ui": patch
---

fix: send an attachment whose data URL is not base64 (such as `data:text/plain,hello` or a percent-encoded SVG) as an AG-UI `url` source instead of a `data` source that claims to hold base64, so the agent receives the file intact and it is no longer wrapped in a second data URL when a snapshot is restored.

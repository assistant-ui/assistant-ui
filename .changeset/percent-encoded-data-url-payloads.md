---
"@assistant-ui/core": patch
---

Percent-decode base64 data URL payloads before forwarding them to model adapters, so escaped padding and alphabet characters are sent as bare base64.

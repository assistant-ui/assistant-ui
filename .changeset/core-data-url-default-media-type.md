---
"@assistant-ui/core": patch
---

fix: extract base64 data from URLs that omit the media type, preserving explicit file-type hints and defaulting standalone parsing to text/plain.

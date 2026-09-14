---
"@assistant-ui/core": patch
"@assistant-ui/react-google-adk": patch
"@assistant-ui/react-a2a": patch
---

fix: parse base64 data URLs without a media type across core converters, Google ADK, and A2A, defaulting them to `application/octet-stream` and keeping `text/plain` for media-less percent-encoded data URLs. Outgoing base64 URL envelopes without a type are stamped with the same default so downstream adapters do not receive an empty media type.

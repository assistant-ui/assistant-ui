---
"@assistant-ui/core": patch
"@assistant-ui/react-google-adk": patch
---

fix: parse base64 data URLs without a media type across core converters and Google ADK, using a bare text/plain default when no contextual type is available

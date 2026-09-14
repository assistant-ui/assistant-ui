---
"@assistant-ui/core": patch
"@assistant-ui/react-google-adk": patch
"@assistant-ui/react-a2a": patch
---

fix: parse base64 data URLs without a media type across core converters, Google ADK, and A2A, using a bare text/plain default when no contextual type is available

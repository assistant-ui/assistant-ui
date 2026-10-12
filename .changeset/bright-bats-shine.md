---
"@assistant-ui/react-a2a": patch
"@assistant-ui/react-google-adk": patch
"@assistant-ui/react-pi": patch
---

fix: ignore the first SSE field when a stream starts with two byte order marks, as required by the event stream spec

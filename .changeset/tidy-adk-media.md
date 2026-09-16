---
"@assistant-ui/react-google-adk": patch
---

fix: skip media parts missing `mimeType`, `data`, or `fileUri` instead of failing the session load or rendering them with an undefined source

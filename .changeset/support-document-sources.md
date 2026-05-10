---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-ai-sdk": patch
---

Support AI SDK `source-document` parts by preserving them as assistant-ui
document source message parts across conversion and cloud serialization,
including the legacy React cloud encoder.
